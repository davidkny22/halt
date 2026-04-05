import { createWorker } from "./queue.js";
import type { Job } from "bullmq";
import { dispatchAlert } from "../alerts/dispatcher.js";

export function startAlertDelivery() {
  return createWorker("alerts", async (job: Job) => {
    const { alertId, userId, severity } = job.data;
    await dispatchAlert({ alertId, userId, severity });
  });
}
