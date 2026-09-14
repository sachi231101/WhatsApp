import { Queue } from 'bullmq';
import { getRedisOptions, isRedisAvailable } from './redis';

export const WEBHOOK_QUEUE_NAME = 'whatsapp-webhooks';

export interface WebhookJobData {
  webhookEventId: string;
  externalEventId?: string;
  payload: any;
  receivedAt?: string;
}

// In-memory test store to verify queue operations in Vitest/testing
export const testEnqueuedJobs: Array<{ name: string; data: WebhookJobData; opts?: any }> = [];

let bullQueue: Queue<WebhookJobData> | null = null;

export function getWebhookQueue(): Queue<WebhookJobData> | null {
  if (process.env.NODE_ENV === 'test' || !isRedisAvailable()) {
    return null;
  }

  if (!bullQueue) {
    try {
      bullQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
        connection: getRedisOptions(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
    } catch (err) {
      console.warn('[WebhookQueue] Could not initialize BullMQ queue:', err);
      bullQueue = null;
    }
  }

  return bullQueue;
}

/**
 * Enqueues a webhook event for asynchronous background processing via BullMQ.
 * In test mode or fallback, records into in-memory queue for deterministic verification.
 */
export async function enqueueWebhookEvent(
  data: WebhookJobData,
  opts?: { jobId?: string },
): Promise<{ id: string; enqueued: boolean }> {
  const jobId = opts?.jobId || data.externalEventId || data.webhookEventId;

  // Track in test harness
  testEnqueuedJobs.push({
    name: 'meta-webhook-event',
    data,
    opts: { jobId },
  });

  const queue = getWebhookQueue();
  if (queue) {
    try {
      const job = await queue.add('meta-webhook-event', data, {
        jobId,
      });
      return { id: job.id || jobId, enqueued: true };
    } catch (err) {
      console.error('[WebhookQueue] Failed to add job to Redis queue:', err);
      // Fall back gracefully so HTTP response doesn't fail
      return { id: jobId, enqueued: false };
    }
  }

  return { id: jobId, enqueued: true };
}

export function clearTestJobs(): void {
  testEnqueuedJobs.length = 0;
}
