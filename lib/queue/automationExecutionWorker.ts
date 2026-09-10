import { Worker, Job } from 'bullmq';
import { sql } from '@/lib/db';
import { getRedisOptions, isRedisAvailable } from './redis';
import {
  AUTOMATION_EXECUTION_QUEUE_NAME,
  AutomationExecutionJobData,
} from './automationExecutionQueue';
import {
  automationEngine,
  ExecutionLockService,
  executionObservability,
} from '@/lib/services/automation/execution';
import { automationDomainService } from '@/lib/services/automation/automationDomainService';

export interface AutomationJobResult {
  success: boolean;
  status?: string;
  skipped?: boolean;
  cancelled?: boolean;
  locked?: boolean;
  permanent?: boolean;
  reason?: string;
  errorCode?: string;
}

/**
 * Permanent error codes that should NOT trigger BullMQ retries because the workflow or
 * configuration is inherently invalid and cannot succeed without user changes.
 */
export const PERMANENT_EXECUTION_ERROR_CODES = new Set([
  'INVALID_EXECUTION',
  'WORKFLOW_NOT_FOUND',
  'VERSION_NOT_FOUND',
  'VERSION_NOT_PUBLISHED',
  'NODE_NOT_FOUND',
  'INVALID_NODE',
  'INVALID_EDGE',
  'NO_MATCHING_BRANCH',
  'INVALID_CONFIGURATION',
  'NODE_NOT_IMPLEMENTED',
  'MAX_EXECUTION_STEPS_EXCEEDED',
  'TENANT_ACCESS_ERROR',
  'AUTOMATION_PAUSED',
  'AUTOMATION_ARCHIVED',
]);

/**
 * Worker processor function for automation execution jobs.
 * Implements strict database verification, tenant validation, idempotency checks,
 * lock conflict mitigation, and permanent vs. transient error classification.
 */
export async function processAutomationExecutionJob(
  data: AutomationExecutionJobData,
  job?: Job<AutomationExecutionJobData>
): Promise<AutomationJobResult> {
  const { executionId, workspaceId, projectId } = data;
  const startTime = Date.now();
  const attemptNumber = (job?.attemptsMade || 0) + 1;

  await executionObservability.log({
    action: 'automation.job.received',
    workspaceId: workspaceId || 'unknown',
    projectId: projectId || 'unknown',
    executionId,
    metadata: {
      jobId: job?.id,
      attemptNumber,
    },
  });

  // 1. Load canonical execution record from database
  const { rows: execRows } = await sql`
    SELECT id, workspace_id, project_id, automation_id, automation_version_id, status, current_node_id
    FROM automation_executions
    WHERE id = ${executionId}
    LIMIT 1;
  `;

  if (!execRows || execRows.length === 0) {
    await executionObservability.log({
      action: 'automation.job.failed',
      workspaceId: workspaceId || 'unknown',
      projectId: projectId || 'unknown',
      executionId,
      errorCode: 'EXECUTION_NOT_FOUND',
      errorMessage: `Execution "${executionId}" not found in database.`,
      durationMs: Date.now() - startTime,
    });
    // Permanent error: Do not retry non-existent records
    return { success: false, reason: 'EXECUTION_NOT_FOUND', permanent: true };
  }

  const execution = execRows[0];

  // 2. Tenant isolation verification (Canonical DB check)
  if (
    (workspaceId && execution.workspace_id !== workspaceId) ||
    (projectId && execution.project_id !== projectId)
  ) {
    await executionObservability.log({
      action: 'automation.job.failed',
      workspaceId: execution.workspace_id,
      projectId: execution.project_id,
      executionId,
      errorCode: 'TENANT_ACCESS_ERROR',
      errorMessage: 'Queue payload tenant does not match database execution record.',
      durationMs: Date.now() - startTime,
    });

    await automationDomainService.updateExecutionStatus(
      execution.workspace_id,
      execution.project_id,
      executionId,
      {
        status: 'FAILED',
        errorCode: 'TENANT_ACCESS_ERROR',
        errorMessage: 'Tenant access violation: payload metadata mismatch.',
        failedAt: new Date().toISOString(),
      }
    );

    return { success: false, reason: 'TENANT_ACCESS_ERROR', permanent: true };
  }

  // 3. Database status check (Skip terminal executions - Idempotency)
  if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(execution.status)) {
    await executionObservability.log({
      action: 'automation.execution.skipped',
      workspaceId: execution.workspace_id,
      projectId: execution.project_id,
      automationId: execution.automation_id,
      versionId: execution.automation_version_id,
      executionId,
      status: execution.status,
      durationMs: Date.now() - startTime,
      reason: `Execution is already in terminal state: ${execution.status}`,
    });

    return { success: true, skipped: true, status: execution.status };
  }

  // 4. Check if automation is PAUSED before running
  const { rows: autoRows } = await sql`
    SELECT id, status
    FROM automations
    WHERE id = ${execution.automation_id}
      AND workspace_id = ${execution.workspace_id}
      AND project_id = ${execution.project_id}
    LIMIT 1;
  `;

  if (autoRows && autoRows.length > 0 && autoRows[0].status === 'PAUSED') {
    await automationDomainService.updateExecutionStatus(
      execution.workspace_id,
      execution.project_id,
      executionId,
      {
        status: 'CANCELLED',
        errorMessage: 'Automation is paused. Queued execution was cancelled.',
        completedAt: new Date().toISOString(),
      }
    );

    await executionObservability.log({
      action: 'automation.execution.skipped',
      workspaceId: execution.workspace_id,
      projectId: execution.project_id,
      automationId: execution.automation_id,
      versionId: execution.automation_version_id,
      executionId,
      status: 'CANCELLED',
      durationMs: Date.now() - startTime,
      reason: 'Automation is paused. Queued execution was cancelled.',
    });

    return { success: true, cancelled: true, status: 'CANCELLED' };
  }

  // 5. Check distributed execution lock before starting
  const isLocked = await ExecutionLockService.isLocked(executionId);
  if (isLocked) {
    await executionObservability.log({
      action: 'automation.execution.lock_conflict',
      workspaceId: execution.workspace_id,
      projectId: execution.project_id,
      automationId: execution.automation_id,
      versionId: execution.automation_version_id,
      executionId,
      durationMs: Date.now() - startTime,
      reason: 'Execution lock held by another active worker.',
    });

    // If already RUNNING by another worker, do not duplicate work
    if (execution.status === 'RUNNING') {
      return { success: true, locked: true, skipped: true };
    }
  }

  // 6. Invoke AutomationEngine
  try {
    const result = await automationEngine.run(executionId, {
      attemptNumber,
      resumeFromCurrentNode: true,
    });

    if (result.status === 'COMPLETED') {
      await executionObservability.log({
        action: 'automation.job.completed',
        workspaceId: execution.workspace_id,
        projectId: execution.project_id,
        automationId: execution.automation_id,
        versionId: execution.automation_version_id,
        executionId,
        status: 'COMPLETED',
        durationMs: Date.now() - startTime,
      });

      return { success: true, status: 'COMPLETED' };
    }

    if (result.status === 'FAILED') {
      const errorCode = result.errorCode || 'ACTION_ERROR';
      const isPermanent = PERMANENT_EXECUTION_ERROR_CODES.has(errorCode);

      await executionObservability.log({
        action: 'automation.job.failed',
        workspaceId: execution.workspace_id,
        projectId: execution.project_id,
        automationId: execution.automation_id,
        versionId: execution.automation_version_id,
        executionId,
        status: 'FAILED',
        errorCode,
        errorMessage: result.errorMessage || undefined,
        durationMs: Date.now() - startTime,
        metadata: { isPermanent, attemptNumber },
      });

      // Permanent failure: Return cleanly so BullMQ does not repeatedly retry invalid workflows
      if (isPermanent) {
        return {
          success: false,
          status: 'FAILED',
          errorCode,
          permanent: true,
          reason: result.errorMessage || errorCode,
        };
      }

      // Transient failure: Throw error to trigger BullMQ exponential backoff retry
      await executionObservability.log({
        action: 'automation.job.retrying',
        workspaceId: execution.workspace_id,
        projectId: execution.project_id,
        automationId: execution.automation_id,
        versionId: execution.automation_version_id,
        executionId,
        durationMs: Date.now() - startTime,
        metadata: { attemptNumber },
      });

      throw new Error(`[AutomationWorker] Transient failure during execution ${executionId}: ${result.errorMessage || errorCode}`);
    }

    return { success: true, status: result.status };
  } catch (err: any) {
    // If AutomationEngine threw because lock was acquired concurrently
    if (err.message && err.message.includes('currently being processed by another worker')) {
      await executionObservability.log({
        action: 'automation.execution.lock_conflict',
        workspaceId: execution.workspace_id,
        projectId: execution.project_id,
        automationId: execution.automation_id,
        versionId: execution.automation_version_id,
        executionId,
        durationMs: Date.now() - startTime,
        reason: 'Concurrent lock conflict caught in job processor.',
      });
      return { success: true, locked: true, skipped: true };
    }

    // Re-throw transient infrastructure errors for BullMQ retries
    console.error(`[AutomationWorker] Error processing execution ${executionId}:`, err);
    throw err;
  }
}

/**
 * Worker Manager Class
 */
export class AutomationExecutionWorker {
  private worker: Worker<AutomationExecutionJobData> | null = null;
  private isStopping = false;

  get concurrency(): number {
    return parseInt(process.env.AUTOMATION_WORKER_CONCURRENCY || '5', 10);
  }

  /**
   * Starts the BullMQ worker.
   */
  start(): Worker<AutomationExecutionJobData> | null {
    if (this.worker) {
      return this.worker;
    }

    if (process.env.NODE_ENV === 'test' || !isRedisAvailable()) {
      return null;
    }

    try {
      const redisOptions = getRedisOptions();
      this.isStopping = false;

      this.worker = new Worker<AutomationExecutionJobData>(
        AUTOMATION_EXECUTION_QUEUE_NAME,
        async (job: Job<AutomationExecutionJobData>) => {
          await processAutomationExecutionJob(job.data, job);
        },
        {
          connection: redisOptions,
          concurrency: this.concurrency,
          lockDuration: parseInt(process.env.AUTOMATION_JOB_TIMEOUT_MS || '60000', 10),
          stalledInterval: 30000,
          maxStalledCount: 2,
        }
      );

      this.worker.on('completed', (job) => {
        console.log(`[AutomationWorker] Job ${job.id} completed for execution ${job.data?.executionId}`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(
          `[AutomationWorker] Job ${job?.id} failed for execution ${job?.data?.executionId}:`,
          err.message
        );
      });

      this.worker.on('stalled', (jobId) => {
        console.warn(`[AutomationWorker] Job ${jobId} stalled and will be recovered.`);
      });

      this.worker.on('error', (err) => {
        console.error('[AutomationWorker] Internal worker error:', err.message);
      });

      console.log(`[AutomationWorker] Worker started (concurrency=${this.concurrency})`);
      return this.worker;
    } catch (err: any) {
      console.warn('[AutomationWorker] Could not initialize BullMQ worker:', err.message);
      this.worker = null;
      return null;
    }
  }

  /**
   * Gracefully shuts down the worker, allowing active jobs to finish up to timeoutMs.
   */
  async stop(timeoutMs = 10000): Promise<void> {
    if (!this.worker) return;

    this.isStopping = true;
    console.log(`[AutomationWorker] Gracefully stopping worker (timeout=${timeoutMs}ms)...`);

    try {
      // 1. Pause worker to stop accepting new jobs
      await this.worker.pause();

      // 2. Wait for active jobs or timeout
      const closePromise = this.worker.close();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));

      await Promise.race([closePromise, timeoutPromise]);
      console.log('[AutomationWorker] Worker stopped cleanly.');
    } catch (err: any) {
      console.error('[AutomationWorker] Error during worker shutdown:', err.message);
    } finally {
      this.worker = null;
      this.isStopping = false;
    }
  }

  /**
   * Returns worker health status.
   */
  isHealthy(): boolean {
    return this.worker !== null && !this.isStopping && isRedisAvailable();
  }

  /**
   * Internal reference to underlying worker instance.
   */
  getWorker(): Worker<AutomationExecutionJobData> | null {
    return this.worker;
  }
}

export const automationExecutionWorker = new AutomationExecutionWorker();

export function startAutomationWorker(): Worker<AutomationExecutionJobData> | null {
  return automationExecutionWorker.start();
}

export async function stopAutomationWorker(timeoutMs?: number): Promise<void> {
  await automationExecutionWorker.stop(timeoutMs);
}

export function isAutomationWorkerRunning(): boolean {
  return automationExecutionWorker.isHealthy();
}

export function getAutomationWorkerHealth(): {
  healthy: boolean;
  concurrency: number;
  isRedisAvailable: boolean;
} {
  return {
    healthy: automationExecutionWorker.isHealthy(),
    concurrency: automationExecutionWorker.concurrency,
    isRedisAvailable: isRedisAvailable(),
  };
}
