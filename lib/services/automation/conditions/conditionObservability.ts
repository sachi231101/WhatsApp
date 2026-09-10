// ============================================================================
// Condition Engine Observability & Metrics Foundation
// ============================================================================

export interface ConditionLogPayload {
  action: 'condition.evaluated' | 'condition.error' | 'condition.preview';
  workspaceId: string;
  projectId: string;
  automationId?: string;
  automationVersionId?: string;
  executionId?: string;
  nodeId?: string;
  conditionType: string;
  matched?: boolean;
  branch?: string;
  durationMs: number;
  reason?: string;
  errorCode?: string;
  operator?: string;
}

export interface ConditionMetricsSnapshot {
  evaluations: number;
  matches: number;
  nonMatches: number;
  errors: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
}

class ConditionObservabilityManager {
  private metrics: ConditionMetricsSnapshot = {
    evaluations: 0,
    matches: 0,
    nonMatches: 0,
    errors: 0,
    totalLatencyMs: 0,
    averageLatencyMs: 0,
  };

  /**
   * Log structured condition evaluation event without leaking sensitive records.
   */
  log(payload: ConditionLogPayload): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...payload,
    };

    this.metrics.evaluations++;
    this.metrics.totalLatencyMs += payload.durationMs || 0;
    this.metrics.averageLatencyMs = Math.round(this.metrics.totalLatencyMs / this.metrics.evaluations);

    if (payload.errorCode || payload.action === 'condition.error') {
      this.metrics.errors++;
    } else if (payload.matched) {
      this.metrics.matches++;
    } else {
      this.metrics.nonMatches++;
    }

    if (process.env.NODE_ENV !== 'test') {
      if (payload.errorCode || payload.action === 'condition.error') {
        console.error(`[ConditionEngine] ${payload.action}:`, JSON.stringify(logEntry));
      } else {
        console.log(`[ConditionEngine] ${payload.action}:`, JSON.stringify(logEntry));
      }
    }
  }

  getMetrics(): ConditionMetricsSnapshot {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      evaluations: 0,
      matches: 0,
      nonMatches: 0,
      errors: 0,
      totalLatencyMs: 0,
      averageLatencyMs: 0,
    };
  }
}

export const conditionObservability = new ConditionObservabilityManager();
