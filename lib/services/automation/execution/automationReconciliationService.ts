import { sql } from '@/lib/db';
import { enqueueAutomationExecution } from '@/lib/queue/automationExecutionQueue';
import { ExecutionLockService } from './executionLock';
import { executionObservability } from './executionObservability';
import { automationDomainService } from '../automationDomainService';

export interface ReconciliationReport {
  requeuedOrphanCount: number;
  recoveredRunningCount: number;
  timedOutRunningCount: number;
}

export class AutomationReconciliationService {
  /**
   * Identifies orphaned QUEUED executions that have been waiting beyond the threshold
   * without processing (e.g. initial BullMQ enqueue failed or Redis was temporarily unavailable)
   * and re-enqueues them.
   */
  async reconcileOrphanQueuedExecutions(options?: {
    olderThanMinutes?: number;
    limit?: number;
  }): Promise<number> {
    const olderThanMinutes = options?.olderThanMinutes || 5;
    const limit = options?.limit || 50;

    const { rows: staleQueued } = await sql`
      SELECT id, workspace_id, project_id, automation_id, automation_version_id, trigger_type, current_node_id, created_at
      FROM automation_executions
      WHERE status = 'QUEUED'
        AND created_at < NOW() - (${olderThanMinutes} || ' minutes')::interval
      ORDER BY created_at ASC
      LIMIT ${limit};
    `;

    let requeuedCount = 0;

    for (const execution of staleQueued) {
      try {
        const enqueueResult = await enqueueAutomationExecution({
          executionId: execution.id,
          workspaceId: execution.workspace_id,
          projectId: execution.project_id,
          automationId: execution.automation_id,
          automationVersionId: execution.automation_version_id,
          triggerType: execution.trigger_type,
          triggerNodeId: execution.current_node_id,
        });

        if (enqueueResult.enqueued) {
          requeuedCount++;
          await executionObservability.log({
            action: 'automation.execution.queued',
            workspaceId: execution.workspace_id,
            projectId: execution.project_id,
            automationId: execution.automation_id,
            versionId: execution.automation_version_id,
            executionId: execution.id,
            metadata: {
              reconciled: true,
              reason: 'Orphan QUEUED execution recovered.',
            },
          });
        }
      } catch (err: any) {
        console.warn(`[AutomationReconciliation] Failed to re-enqueue execution ${execution.id}:`, err.message);
      }
    }

    return requeuedCount;
  }

  /**
   * Detects RUNNING executions that appear to be abandoned (worker crashed)
   * because updated_at is older than the stale threshold AND the distributed lock is released/expired.
   */
  async reconcileStaleRunningExecutions(options?: {
    staleMinutes?: number;
    maxRunMinutes?: number;
    limit?: number;
  }): Promise<{ recovered: number; timedOut: number }> {
    const staleMinutes = options?.staleMinutes || 10;
    const maxRunMinutes = options?.maxRunMinutes || 30;
    const limit = options?.limit || 50;

    const { rows: staleRunning } = await sql`
      SELECT id, workspace_id, project_id, automation_id, automation_version_id, trigger_type, current_node_id, started_at, updated_at
      FROM automation_executions
      WHERE status = 'RUNNING'
        AND updated_at < NOW() - (${staleMinutes} || ' minutes')::interval
      ORDER BY updated_at ASC
      LIMIT ${limit};
    `;

    let recovered = 0;
    let timedOut = 0;

    for (const execution of staleRunning) {
      const isLocked = await ExecutionLockService.isLocked(execution.id);
      if (isLocked) {
        // Still actively locked by a legitimate long-running worker
        continue;
      }

      const startedAtTime = execution.started_at ? new Date(execution.started_at).getTime() : 0;
      const runningDurationMinutes = (Date.now() - startedAtTime) / 60000;

      // If running for longer than maxRunMinutes, mark as TIMEOUT
      if (runningDurationMinutes > maxRunMinutes) {
        await automationDomainService.updateExecutionStatus(
          execution.workspace_id,
          execution.project_id,
          execution.id,
          {
            status: 'FAILED',
            errorCode: 'EXECUTION_TIMEOUT',
            errorMessage: `Execution timed out after ${Math.round(runningDurationMinutes)} minutes.`,
            failedAt: new Date().toISOString(),
          }
        );
        timedOut++;
        continue;
      }

      // Otherwise re-enqueue for recovery from current_node_id
      try {
        const enqueueResult = await enqueueAutomationExecution({
          executionId: execution.id,
          workspaceId: execution.workspace_id,
          projectId: execution.project_id,
          automationId: execution.automation_id,
          automationVersionId: execution.automation_version_id,
          triggerType: execution.trigger_type,
          triggerNodeId: execution.current_node_id,
        });

        if (enqueueResult.enqueued) {
          recovered++;
          await executionObservability.log({
            action: 'automation.execution.resumed',
            workspaceId: execution.workspace_id,
            projectId: execution.project_id,
            automationId: execution.automation_id,
            versionId: execution.automation_version_id,
            executionId: execution.id,
            metadata: {
              reconciled: true,
              resumedFromCurrentNode: execution.current_node_id,
            },
          });
        }
      } catch (err: any) {
        console.warn(`[AutomationReconciliation] Failed to recover running execution ${execution.id}:`, err.message);
      }
    }

    return { recovered, timedOut };
  }

  /**
   * Runs complete reconciliation on queued and running executions.
   */
  async reconcileAll(options?: {
    queuedOlderThanMinutes?: number;
    runningStaleMinutes?: number;
    maxRunMinutes?: number;
  }): Promise<ReconciliationReport> {
    const requeuedOrphanCount = await this.reconcileOrphanQueuedExecutions({
      olderThanMinutes: options?.queuedOlderThanMinutes,
    });

    const { recovered: recoveredRunningCount, timedOut: timedOutRunningCount } =
      await this.reconcileStaleRunningExecutions({
        staleMinutes: options?.runningStaleMinutes,
        maxRunMinutes: options?.maxRunMinutes,
      });

    return {
      requeuedOrphanCount,
      recoveredRunningCount,
      timedOutRunningCount,
    };
  }
}

export const automationReconciliationService = new AutomationReconciliationService();
