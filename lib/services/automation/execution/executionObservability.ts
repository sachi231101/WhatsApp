import { publishAutomationEvent } from '@/lib/realtime/ablyPublisher';

// ============================================================================
// Execution Engine Observability & Metrics
// ============================================================================

export type ExecutionLogAction =
  | 'automation.execution.started'
  | 'automation.execution.resumed'
  | 'automation.execution.queued'
  | 'automation.execution.skipped'
  | 'automation.node.started'
  | 'automation.node.completed'
  | 'automation.node.failed'
  | 'automation.execution.completed'
  | 'automation.execution.failed'
  | 'automation.execution.cancelled'
  | 'automation.execution.lock_failed'
  | 'automation.execution.lock_conflict'
  | 'automation.job.received'
  | 'automation.job.started'
  | 'automation.job.completed'
  | 'automation.job.failed'
  | 'automation.job.retrying'
  | 'automation.job.stalled'
  | 'automation.whatsapp_action.started'
  | 'automation.whatsapp_action.queued'
  | 'automation.whatsapp_action.failed'
  | 'automation.ai.started'
  | 'automation.ai.completed'
  | 'automation.ai.failed'
  | 'automation.ai.escalated';

export interface ExecutionLogPayload {
  action: ExecutionLogAction;
  workspaceId: string;
  projectId: string;
  automationId?: string;
  versionId?: string;
  executionId: string;
  nodeId?: string;
  nodeType?: string;
  status?: string;
  branch?: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  stepCount?: number;
  [key: string]: any;
}

export interface ExecutionMetricsSnapshot {
  executionsStarted: number;
  executionsCompleted: number;
  executionsFailed: number;
  executionsCancelled: number;
  nodeExecutions: number;
  nodeFailures: number;
  lockConflicts: number;
  totalDurationMs: number;
  averageDurationMs: number;
}

class ExecutionObservabilityManager {
  private metrics: ExecutionMetricsSnapshot = {
    executionsStarted: 0,
    executionsCompleted: 0,
    executionsFailed: 0,
    executionsCancelled: 0,
    nodeExecutions: 0,
    nodeFailures: 0,
    lockConflicts: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
  };

  /**
   * Records execution event, tracks metrics, and broadcasts to Ably.
   */
  async log(payload: ExecutionLogPayload): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...payload,
    };

    // Update in-memory metrics counters
    switch (payload.action) {
      case 'automation.execution.started':
        this.metrics.executionsStarted++;
        break;
      case 'automation.execution.completed':
        this.metrics.executionsCompleted++;
        this.metrics.totalDurationMs += payload.durationMs || 0;
        this.metrics.averageDurationMs = Math.round(
          this.metrics.totalDurationMs / this.metrics.executionsCompleted
        );
        break;
      case 'automation.execution.failed':
        this.metrics.executionsFailed++;
        break;
      case 'automation.execution.cancelled':
        this.metrics.executionsCancelled++;
        break;
      case 'automation.node.started':
      case 'automation.node.completed':
        this.metrics.nodeExecutions++;
        break;
      case 'automation.node.failed':
        this.metrics.nodeFailures++;
        break;
      case 'automation.execution.lock_failed':
        this.metrics.lockConflicts++;
        break;
    }

    if (process.env.NODE_ENV !== 'test') {
      if (payload.action.includes('failed')) {
        console.error(`[AutomationEngine] ${payload.action}:`, JSON.stringify(logEntry));
      } else {
        console.log(`[AutomationEngine] ${payload.action}:`, JSON.stringify(logEntry));
      }
    }

    // Emit realtime event via Ably
    try {
      await publishAutomationEvent({
        workspaceId: payload.workspaceId,
        projectId: payload.projectId,
        event: payload.action,
        data: {
          executionId: payload.executionId,
          automationId: payload.automationId,
          versionId: payload.versionId,
          nodeId: payload.nodeId,
          status: payload.status,
          branch: payload.branch,
          timestamp,
        },
      });
    } catch {
      // Non-blocking realtime notification
    }
  }

  getMetrics(): ExecutionMetricsSnapshot {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      executionsStarted: 0,
      executionsCompleted: 0,
      executionsFailed: 0,
      executionsCancelled: 0,
      nodeExecutions: 0,
      nodeFailures: 0,
      lockConflicts: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
    };
  }
}

export const executionObservability = new ExecutionObservabilityManager();
