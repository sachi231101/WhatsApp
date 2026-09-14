import { Queue, type JobsOptions } from 'bullmq';
import { getRedisOptions, isRedisAvailable } from './redis';

export const OUTBOUND_QUEUE_NAME = 'whatsapp-outbound';

export interface OutboundJobData {
  messageId: string;
  workspaceId: string;
  projectId: string;
  conversationId: string;
  destPhone: string;
  body: string;
  type?: string;
  mediaUrl?: string;
  replyToMetaId?: string;
  idempotencyKey?: string;
  caption?: string;
  templateName?: string;
  templateParams?: Record<string, any> | any[];
  phoneNumberId?: string;
  metadata?: Record<string, any>;
}

// In-memory test harness
export interface MockOutboundJob {
  id: string;
  name: string;
  data: OutboundJobData;
  opts?: JobsOptions;
}

export const testEnqueuedOutboundJobs: MockOutboundJob[] = [];

export function clearTestOutboundJobs(): void {
  testEnqueuedOutboundJobs.length = 0;
}

let outboundQueueInstance: Queue<OutboundJobData> | null = null;

export function getOutboundQueue(): Queue<OutboundJobData> | null {
  if (!isRedisAvailable()) {
    return null;
  }

  if (!outboundQueueInstance) {
    try {
      outboundQueueInstance = new Queue<OutboundJobData>(OUTBOUND_QUEUE_NAME, {
        connection: getRedisOptions(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });
    } catch (err) {
      console.warn('[OutboundQueue] Could not initialize BullMQ queue:', err);
      outboundQueueInstance = null;
    }
  }

  return outboundQueueInstance;
}

/**
 * Enqueues an outbound WhatsApp message for asynchronous sending by the worker.
 * When Redis is unavailable or enqueue fails, processes the job inline (dev-safe).
 * In test env, only records to the in-memory harness (no live Meta calls).
 */
export async function enqueueOutboundMessage(data: OutboundJobData): Promise<string> {
  const jobId = `outbound-${data.messageId}`;

  // In test environment, record to mock array to avoid requiring live Redis / Meta
  if (process.env.NODE_ENV === 'test') {
    testEnqueuedOutboundJobs.push({
      id: jobId,
      name: 'send-message',
      data,
    });
    return jobId;
  }

  const queue = getOutboundQueue();
  if (queue) {
    try {
      const job = await queue.add('send-message', data, {
        jobId,
      });
      return job.id || jobId;
    } catch (err) {
      console.warn('[OutboundQueue] Redis enqueue error, processing inline:', err);
    }
  } else {
    console.log('[OutboundQueue] Redis unavailable — processing outbound message inline');
  }

  // Inline fallback (no Redis / enqueue failed) — same pattern as webhook queue
  try {
    const { processOutboundJob } = await import('./outboundWorker');
    await processOutboundJob(data);
  } catch (inlineErr) {
    console.error('[OutboundQueue] Inline outbound processing failed:', inlineErr);
    // processOutboundJob marks the message failed in DB when possible
  }

  return jobId;
}
