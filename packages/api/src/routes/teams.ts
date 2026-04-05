import type { FastifyInstance } from "fastify";
import { eq, and, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getDb } from "../db/client.js";
import {
  teams,
  teamMembers,
  teamInvites,
  sharedRules,
  agents,
  events,
  alerts,
  users,
} from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { ruleConfigSchema, TIER_FEATURES, type Tier } from "@halt/shared";

const createTeamBody = z.object({
  name: z.string().min(1).max(255),
});

const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "editor", "viewer"]).default("editor"),
});

const sharedRuleBody = z.object({
  name: z.string().min(1).max(255),
  config: ruleConfigSchema,
  scope: z.array(z.string()).nullable().optional(),
});

export async function teamsRoutes(app: FastifyInstance) {
  // Create team
  app.post("/api/teams", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const parsed = createTeamBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", message: "name required" });
      }

      const db = getDb();
      const userId = request.userId!;

      // Check user doesn't already own a team
      const existing = await db
        .select()
        .from(teams)
        .where(eq(teams.owner_id, userId));

      if (existing.length > 0) {
        return reply.status(409).send({ error: "You already own a team" });
      }

      const [team] = await db
        .insert(teams)
        .values({ name: parsed.data.name, owner_id: userId })
        .returning();

      // Add owner as admin member
      await db.insert(teamMembers).values({
        team_id: team.id,
        user_id: userId,
        role: "owner",
      });

      return reply.status(201).send(team);
    },
  });

  // Get user's team
  app.get("/api/teams", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      const memberships = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.user_id, userId));

      if (memberships.length === 0) {
        return reply.send({ team: null });
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, memberships[0].team_id));

      // Get all members
      const members = await db
        .select({
          id: teamMembers.id,
          user_id: teamMembers.user_id,
          role: teamMembers.role,
          joined_at: teamMembers.joined_at,
          email: users.email,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.user_id, users.id))
        .where(eq(teamMembers.team_id, team.id));

      // Get team agents (all agents from all team members)
      const memberIds = members.map((m) => m.user_id);
      const teamAgents: any[] = [];
      for (const memberId of memberIds) {
        const userAgents = await db
          .select()
          .from(agents)
          .where(eq(agents.user_id, memberId));
        teamAgents.push(
          ...userAgents.map((a) => ({
            ...a,
            owner_email: members.find((m) => m.user_id === memberId)?.email,
          }))
        );
      }

      // Get shared rules
      const rules = await db
        .select()
        .from(sharedRules)
        .where(eq(sharedRules.team_id, team.id));

      return reply.send({
        team,
        members,
        agents: teamAgents,
        shared_rules: rules,
        agent_count: teamAgents.length,
        max_agents: team.max_agents,
      });
    },
  });

  // Invite member
  app.post("/api/teams/:teamId/invite", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const parsed = inviteBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Valid email required" });
      }

      const db = getDb();
      const userId = request.userId!;

      // Check user is admin of this team
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, userId),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        );

      if (!membership) {
        return reply.status(403).send({ error: "Only admins can invite members" });
      }

      // Enforce member limit based on team owner's tier
      const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
      if (!team) return reply.status(404).send({ error: "Team not found" });
      const [owner] = await db.select().from(users).where(eq(users.id, team.owner_id));
      const ownerTier = (owner?.tier || "free") as Tier;
      const maxMembers = TIER_FEATURES[ownerTier]?.maxTeamMembers || 2;

      const currentMembers = await db
        .select({ value: count() })
        .from(teamMembers)
        .where(eq(teamMembers.team_id, teamId));

      if (Number(currentMembers[0].value) >= maxMembers) {
        return reply.status(403).send({
          error: "Member limit reached",
          message: `Your ${ownerTier} plan allows up to ${maxMembers} team members. Upgrade for more.`,
        });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invite] = await db
        .insert(teamInvites)
        .values({
          team_id: teamId,
          email: parsed.data.email,
          role: parsed.data.role as any,
          token,
          expires_at: expiresAt,
        })
        .returning();

      // Send invite email via Resend
      try {
        const { Resend } = await import("resend");
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const resend = new Resend(resendKey);
          const inviteUrl = `https://app.halt.dev/team?invite=${token}`;
          await resend.emails.send({
            from: "Halt <login@halt.dev>",
            to: parsed.data.email,
            subject: "You've been invited to a Halt team",
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto"><h2 style="color:#FF6B4A">You're invited to join a team on Halt</h2><p>You've been invited as <strong>${parsed.data.role}</strong> to a team on Halt — agent monitoring and safety for OpenClaw.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#FF6B4A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Accept Invite</a></p><p style="color:#888;font-size:12px">This invite expires in 7 days.</p></div>`,
          });
        }
      } catch (err) {
        request.log.error("Failed to send team invite email: %s", (err as Error).message);
      }

      return reply.status(201).send({
        invite_id: invite.id,
        email: parsed.data.email,
        expires_at: expiresAt,
        invite_url: `https://app.halt.dev/team?invite=${token}`,
      });
    },
  });

  // Accept invite
  app.post("/api/teams/accept-invite", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { token } = request.body as { token: string };
      if (!token) {
        return reply.status(400).send({ error: "Token required" });
      }

      const db = getDb();
      const userId = request.userId!;

      const [invite] = await db
        .select()
        .from(teamInvites)
        .where(eq(teamInvites.token, token));

      if (!invite) {
        return reply.status(404).send({ error: "Invalid invite" });
      }

      if (invite.accepted_at) {
        return reply.status(409).send({ error: "Invite already accepted" });
      }

      if (new Date() > invite.expires_at) {
        return reply.status(410).send({ error: "Invite expired" });
      }

      // Verify the invite email matches the authenticated user
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || user.email !== invite.email) {
        return reply.status(403).send({ error: "This invite was sent to a different email address" });
      }

      // Add user to team
      await db.insert(teamMembers).values({
        team_id: invite.team_id,
        user_id: userId,
        role: invite.role,
      });

      // Mark invite as accepted
      await db
        .update(teamInvites)
        .set({ accepted_at: new Date() })
        .where(eq(teamInvites.id, invite.id));

      return reply.send({ joined: true, team_id: invite.team_id });
    },
  });

  // Remove member
  app.delete("/api/teams/:teamId/members/:memberId", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { teamId, memberId } = request.params as {
        teamId: string;
        memberId: string;
      };
      const db = getDb();
      const userId = request.userId!;

      // Check requester is admin
      const [adminCheck] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, userId),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        );

      if (!adminCheck) {
        return reply.status(403).send({ error: "Only admins can remove members" });
      }

      // Can't remove the team owner
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      if (!team) return reply.status(404).send({ error: "Team not found" });
      if (team.owner_id === memberId) {
        return reply.status(400).send({ error: "Cannot remove team owner" });
      }

      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, memberId)
          )
        );

      return reply.send({ removed: true });
    },
  });

  // Create shared rule
  app.post("/api/teams/:teamId/rules", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const parsed = sharedRuleBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid rule" });
      }

      const db = getDb();
      const userId = request.userId!;

      // Check user is member of team
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, userId)
          )
        );

      if (!membership) {
        return reply.status(403).send({ error: "Not a team member" });
      }

      const [rule] = await db
        .insert(sharedRules)
        .values({
          team_id: teamId,
          name: parsed.data.name,
          rule_type: parsed.data.config.type,
          config: parsed.data.config,
          scope: parsed.data.scope || null,
        })
        .returning();

      return reply.status(201).send(rule);
    },
  });

  // List shared rules
  app.get("/api/teams/:teamId/rules", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const db = getDb();
      const userId = request.userId!;

      // Check user is member
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, userId)
          )
        );

      if (!membership) {
        return reply.status(403).send({ error: "Not a team member" });
      }

      const rules = await db
        .select()
        .from(sharedRules)
        .where(eq(sharedRules.team_id, teamId));

      return reply.send({ rules });
    },
  });

  // Delete shared rule
  app.delete("/api/teams/:teamId/rules/:ruleId", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { teamId, ruleId } = request.params as {
        teamId: string;
        ruleId: string;
      };
      const db = getDb();
      const userId = request.userId!;

      // Check user is admin
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, userId),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        );

      if (!membership) {
        return reply.status(403).send({ error: "Only admins can delete shared rules" });
      }

      await db
        .delete(sharedRules)
        .where(
          and(eq(sharedRules.id, ruleId), eq(sharedRules.team_id, teamId))
        );

      return reply.send({ deleted: true });
    },
  });

  // Team stats
  app.get("/api/teams/:teamId/stats", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { teamId } = request.params as { teamId: string };
      const db = getDb();
      const userId = request.userId!;

      // Check membership
      const [membership] = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.team_id, teamId),
            eq(teamMembers.user_id, userId)
          )
        );

      if (!membership) {
        return reply.status(403).send({ error: "Not a team member" });
      }

      // Get all member IDs
      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.team_id, teamId));

      const memberIds = members.map((m) => m.user_id);

      // Count agents and their statuses
      let totalAgents = 0;
      let activeAgents = 0;
      let pausedAgents = 0;
      let learningAgents = 0;

      for (const memberId of memberIds) {
        const userAgents = await db
          .select()
          .from(agents)
          .where(eq(agents.user_id, memberId));

        totalAgents += userAgents.length;
        activeAgents += userAgents.filter((a) => a.status === "active").length;
        pausedAgents += userAgents.filter((a) => a.status === "paused").length;
        learningAgents += userAgents.filter((a) => a.status === "learning").length;
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      return reply.send({
        total_agents: totalAgents,
        active_agents: activeAgents,
        paused_agents: pausedAgents,
        learning_agents: learningAgents,
        max_agents: team?.max_agents ?? 10,
        member_count: members.length,
      });
    },
  });
}
