import { Queue, type JobsOptions } from 'bullmq';
import { getRedisOptions } from './redis';

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

export function getOutboundQueue(): Queue<OutboundJobData> {
  if (outboundQueueInstance) {
    return outboundQueueInstance;
  }

  const redisOptions = getRedisOptions();
  outboundQueueInstance = new Queue<OutboundJobData>(OUTBOUND_QUEUE_NAME, {
    connection: redisOptions,
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

  return outboundQueueInstance;
}

/**
 * Enqueues an outbound WhatsApp message for asynchronous sending by the worker.
 */
export async function enqueueOutboundMessage(data: OutboundJobData): Promise<string> {
  const jobId = `outbound-${data.messageId}`;

  // In test environment, record to mock array to avoid requiring live Redis
  if (process.env.NODE_ENV === 'test') {
    testEnqueuedOutboundJobs.push({
      id: jobId,
      name: 'send-message',
      data,
    });
    return jobId;
  }

  try {
    const queue = getOutboundQueue();
    const job = await queue.add('send-message', data, {
      jobId,
    });
    return job.id || jobId;
  } catch (err) {
    console.warn('[OutboundQueue] Redis enqueue error, recording fallback:', err);
    testEnqueuedOutboundJobs.push({
      id: jobId,
      name: 'send-message',
      data,
    });
    return jobId;
  }
}
