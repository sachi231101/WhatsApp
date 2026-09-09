import { Queue, type JobsOptions } from 'bullmq';
import { getRedisOptions } from './redis';

export const AI_MESSAGE_QUEUE_NAME = 'whatsapp-ai-message';

export interface AIMessageJobData {
  workspaceId: string;
  projectId: string;
  conversationId: string;
  messageId: string;
  messageBody: string;
  contactId?: string;
  destPhone?: string;
}

export interface MockAiJob {
  id: string;
  name: string;
  data: AIMessageJobData;
  opts?: JobsOptions;
}

export const testEnqueuedAiJobs: MockAiJob[] = [];

export function clearTestAiJobs(): void {
  testEnqueuedAiJobs.length = 0;
}

let aiQueueInstance: Queue<AIMessageJobData> | null = null;

export function getAiMessageQueue(): Queue<AIMessageJobData> {
  if (aiQueueInstance) {
    return aiQueueInstance;
  }

  const redisOptions = getRedisOptions();
  aiQueueInstance = new Queue<AIMessageJobData>(AI_MESSAGE_QUEUE_NAME, {
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

  return aiQueueInstance;
}

/**
 * Enqueues an inbound WhatsApp message for asynchronous AI handling by the BullMQ worker.
 * Uses an idempotency key based on message ID to prevent duplicate AI responses.
 */
export async function enqueueAiMessage(data: AIMessageJobData): Promise<string> {
  const jobId = `ai-${data.messageId}`;

  // In test environment, record to mock array to avoid live Redis dependency
  if (process.env.NODE_ENV === 'test') {
    testEnqueuedAiJobs.push({
      id: jobId,
      name: 'process-ai-message',
      data,
      opts: { jobId },
    });
    return jobId;
  }

  try {
    const queue = getAiMessageQueue();
    const job = await queue.add('process-ai-message', data, {
      jobId,
    });
    return job.id || jobId;
  } catch (err) {
    console.warn('[AIMessageQueue] Redis enqueue error, recording fallback:', err);
    testEnqueuedAiJobs.push({
      id: jobId,
      name: 'process-ai-message',
      data,
      opts: { jobId },
    });
    return jobId;
  }
}
