import { Queue, Worker, type Processor, type WorkerOptions } from "bullmq";
import { getConfig } from "../config.js";

function getConnectionOpts() {
  const config = getConfig();
  const url = new URL(config.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
  };
}

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: getConnectionOpts() });
}

export function createWorker(
  name: string,
  processor: Processor,
  opts?: Partial<WorkerOptions>
): Worker {
  return new Worker(name, processor, {
    connection: getConnectionOpts(),
    ...opts,
  });
}
