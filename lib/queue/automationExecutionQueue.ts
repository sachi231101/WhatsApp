import { Queue, type JobsOptions } from 'bullmq';
import { getRedisOptions } from './redis';
import { TriggerContext } from '@/lib/services/automation/triggerContext';

export const AUTOMATION_EXECUTION_QUEUE_NAME = 'automation-executions';

export interface AutomationExecutionJobData {
  executionId: string;
  workspaceId: string;
  projectId: string;
  automationId: string;
  automationVersionId: string;
  triggerType?: string;
  triggerNodeId?: string;
  context?: TriggerContext;
}

export interface MockAutomationJob {
  id: string;
  name: string;
  data: AutomationExecutionJobData;
  opts?: JobsOptions;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// In-memory test harness for Vitest / testing
export const testEnqueuedAutomationJobs: MockAutomationJob[] = [];

export function clearTestAutomationJobs(): void {
  testEnqueuedAutomationJobs.length = 0;
}

let automationExecutionQueueInstance: Queue<AutomationExecutionJobData> | null = null;

export function getAutomationExecutionQueue(): Queue<AutomationExecutionJobData> | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!automationExecutionQueueInstance) {
    try {
      const redisOptions = getRedisOptions();
      automationExecutionQueueInstance = new Queue<AutomationExecutionJobData>(
        AUTOMATION_EXECUTION_QUEUE_NAME,
        {
          connection: redisOptions,
          defaultJobOptions: {
            attempts: parseInt(process.env.AUTOMATION_MAX_ATTEMPTS || '3', 10),
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        }
      );
    } catch (err) {
      console.warn('[AutomationExecutionQueue] Could not initialize BullMQ queue:', err);
      automationExecutionQueueInstance = null;
    }
  }

  return automationExecutionQueueInstance;
}

/**
 * Enqueues an automation execution for asynchronous processing by the BullMQ worker.
 * Generates a deterministic job ID to prevent duplicate active jobs for the same execution.
 * In test mode or when Redis is unavailable, records into testEnqueuedAutomationJobs.
 */
export async function enqueueAutomationExecution(
  data: AutomationExecutionJobData,
  opts?: { jobId?: string; priority?: number; delay?: number }
): Promise<{ id: string; enqueued: boolean }> {
  // Deterministic Job ID to prevent duplicate active processing
  const jobId = opts?.jobId || `automation-execution:${data.executionId}`;

  testEnqueuedAutomationJobs.push({
    id: jobId,
    name: 'run-automation-execution',
    data,
    opts: { jobId, priority: opts?.priority, delay: opts?.delay },
  });

  const queue = getAutomationExecutionQueue();
  if (queue) {
    try {
      const job = await queue.add('run-automation-execution', data, {
        jobId,
        priority: opts?.priority,
        delay: opts?.delay,
      });
      return { id: job.id || jobId, enqueued: true };
    } catch (err) {
      console.error('[AutomationExecutionQueue] Failed to add execution to Redis queue:', err);
      return { id: jobId, enqueued: false };
    }
  }

  return { id: jobId, enqueued: true };
}

/**
 * Retrieves queue health and metrics for administrative/telemetry monitoring.
 */
export async function getAutomationQueueMetrics(): Promise<QueueMetrics> {
  const queue = getAutomationExecutionQueue();
  if (!queue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  try {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  } catch (err) {
    console.warn('[AutomationExecutionQueue] Error fetching queue counts:', err);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
}

/**
 * Gracefully closes the BullMQ queue instance.
 */
export async function closeAutomationExecutionQueue(): Promise<void> {
  if (automationExecutionQueueInstance) {
    try {
      await automationExecutionQueueInstance.close();
    } catch (err) {
      console.warn('[AutomationExecutionQueue] Error closing queue:', err);
    }
    automationExecutionQueueInstance = null;
  }
}
