import { createWorker } from "./queue.js";
import type { Job } from "bullmq";
import { getDb } from "../db/client.js";
import { baselines, events } from "../db/schema.js";
import { eq, and, gte } from "drizzle-orm";
import { buildProfile, isLearningComplete } from "../ai/baseline-builder.js";
import type { HaltEvent } from "@halt/shared";

export function startBaselineUpdateWorker() {
  return createWorker("baseline-update", async (job: Job) => {
    const db = getDb();

    // Get all baselines (both learning and active)
    const allBaselines = await db.select().from(baselines);
    let updated = 0;

    for (const baseline of allBaselines) {
      // Get today's events for this agent
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const todayEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.agent_id, baseline.agent_id),
            gte(events.timestamp, dayStart)
          )
        );

      if (todayEvents.length === 0) continue;

      // Estimate active hours from events (rough: count distinct hours with activity)
      const activeHoursToday = new Set(
        todayEvents.map((e) => new Date(e.timestamp).getHours())
      ).size;

      const newAccumulatedHours =
        parseFloat(baseline.accumulated_hours) + activeHoursToday;

      // Build updated profile
      const newProfile = buildProfile(todayEvents as unknown as HaltEvent[]);

      // If existing profile exists, merge with decay
      const existingProfile = baseline.profile as any;
      const mergedProfile =
        existingProfile && Object.keys(existingProfile).length > 0
          ? mergeProfiles(existingProfile, newProfile, 0.7) // 70% weight on recent
          : newProfile;

      // Check if learning is complete
      const status = isLearningComplete(newAccumulatedHours)
        ? "active"
        : "learning";

      await db
        .update(baselines)
        .set({
          profile: mergedProfile as any,
          accumulated_hours: String(newAccumulatedHours),
          status,
          updated_at: new Date(),
        })
        .where(eq(baselines.id, baseline.id));

      updated++;
    }

    return { updated };
  });
}

function mergeProfiles(old: any, fresh: any, freshWeight: number): any {
  const oldWeight = 1 - freshWeight;

  return {
    toolDistribution: mergeCountMaps(
      old.toolDistribution || {},
      fresh.toolDistribution || {},
      freshWeight
    ),
    eventTypeDistribution: mergeCountMaps(
      old.eventTypeDistribution || {},
      fresh.eventTypeDistribution || {},
      freshWeight
    ),
    avgCostPerSession:
      (old.avgCostPerSession || 0) * oldWeight +
      (fresh.avgCostPerSession || 0) * freshWeight,
    avgTokensPerSession:
      (old.avgTokensPerSession || 0) * oldWeight +
      (fresh.avgTokensPerSession || 0) * freshWeight,
    avgEventsPerHour:
      (old.avgEventsPerHour || 0) * oldWeight +
      (fresh.avgEventsPerHour || 0) * freshWeight,
    errorRate:
      (old.errorRate || 0) * oldWeight + (fresh.errorRate || 0) * freshWeight,
    activeHours: (old.activeHours || new Array(24).fill(0)).map(
      (v: number, i: number) =>
        v * oldWeight + ((fresh.activeHours || [])[i] || 0) * freshWeight
    ),
  };
}

function mergeCountMaps(
  old: Record<string, number>,
  fresh: Record<string, number>,
  freshWeight: number
): Record<string, number> {
  const result: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(old), ...Object.keys(fresh)]);
  const oldWeight = 1 - freshWeight;

  for (const key of allKeys) {
    result[key] = (old[key] || 0) * oldWeight + (fresh[key] || 0) * freshWeight;
  }

  return result;
}
