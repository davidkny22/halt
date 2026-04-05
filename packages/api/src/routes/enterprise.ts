/**
 * Enterprise features (SSO, audit logs, custom webhooks, custom roles).
 * Full implementation available in ee/packages/api/src/routes/enterprise.ts
 * with a valid halt Enterprise license.
 */
import type { FastifyInstance } from "fastify";

/**
 * Audit logging stub. Full implementation in ee/.
 * No-op in open-source build — audit events are silently dropped.
 */
export async function logAudit(_opts: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  // Enterprise feature — no-op in open-source build.
}

export async function enterpriseRoutes(app: FastifyInstance) {
  // Enterprise features require a valid license.
  // See ee/ directory for the full implementation.
  app.get("/api/audit-logs", async (_request, reply) => {
    return reply.status(403).send({
      error: "Enterprise feature",
      message: "Audit logs require a halt Enterprise license. Contact david@halt.dev",
    });
  });

  app.get("/api/webhooks", async (_request, reply) => {
    return reply.status(403).send({
      error: "Enterprise feature",
      message: "Custom webhooks require a halt Enterprise license. Contact david@halt.dev",
    });
  });

  app.get("/api/sso", async (_request, reply) => {
    return reply.status(403).send({
      error: "Enterprise feature",
      message: "SSO configuration requires a halt Enterprise license. Contact david@halt.dev",
    });
  });
}
