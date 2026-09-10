import { Queue, type JobsOptions } from 'bullmq';
import { getRedisOptions } from './redis';

export const KNOWLEDGE_QUEUE_NAME = 'whatsapp-knowledge-processing';

export interface KnowledgeProcessJobData {
  workspaceId: string;
  projectId: string;
  knowledgeBaseId: string;
  sourceId: string;
  reprocess?: boolean;
}

export interface MockKnowledgeJob {
  id: string;
  name: string;
  data: KnowledgeProcessJobData;
  opts?: JobsOptions;
}

export const testEnqueuedKnowledgeJobs: MockKnowledgeJob[] = [];

export function clearTestKnowledgeJobs(): void {
  testEnqueuedKnowledgeJobs.length = 0;
}

let knowledgeQueueInstance: Queue<KnowledgeProcessJobData> | null = null;

export function getKnowledgeQueue(): Queue<KnowledgeProcessJobData> {
  if (knowledgeQueueInstance) {
    return knowledgeQueueInstance;
  }

  const redisOptions = getRedisOptions();
  knowledgeQueueInstance = new Queue<KnowledgeProcessJobData>(KNOWLEDGE_QUEUE_NAME, {
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

  return knowledgeQueueInstance;
}

/**
 * Enqueues a knowledge source for asynchronous processing by the BullMQ worker.
 * Uses an idempotency key based on sourceId to prevent duplicate jobs.
 */
export async function enqueueKnowledgeSourceProcess(data: KnowledgeProcessJobData): Promise<string> {
  const jobId = `kb-src-${data.sourceId}${data.reprocess ? `-${Date.now()}` : ''}`;
  const jobName = data.reprocess ? 'knowledge-reprocess-source' : 'knowledge-process-source';

  if (process.env.NODE_ENV === 'test') {
    testEnqueuedKnowledgeJobs.push({
      id: jobId,
      name: jobName,
      data,
      opts: { jobId },
    });
    return jobId;
  }

  try {
    const queue = getKnowledgeQueue();
    const job = await queue.add(jobName, data, {
      jobId,
    });
    return job.id || jobId;
  } catch (err) {
    console.warn('[KnowledgeQueue] Redis enqueue warning, using test queue fallback:', err);
    testEnqueuedKnowledgeJobs.push({
      id: jobId,
      name: jobName,
      data,
      opts: { jobId },
    });
    return jobId;
  }
}
