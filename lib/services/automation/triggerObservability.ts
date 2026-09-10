// ============================================================================
// Trigger Engine Observability & Metrics Foundation
// ============================================================================

export type TriggerLogAction =
  | 'automation.trigger.received'
  | 'automation.trigger.matched'
  | 'automation.trigger.ignored'
  | 'automation.execution.created'
  | 'automation.execution.queued'
  | 'automation.trigger.duplicate'
  | 'automation.trigger.failed';

export interface TriggerLogPayload {
  action: TriggerLogAction;
  workspaceId: string;
  projectId: string;
  eventId?: string;
  eventType?: string;
  automationId?: string;
  automationVersionId?: string;
  executionId?: string;
  triggerType?: string;
  reason?: string;
  error?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface TriggerMetricsSnapshot {
  eventsReceived: number;
  matchingAutomations: number;
  executionsCreated: number;
  executionsQueued: number;
  duplicateSuppressed: number;
  triggersIgnored: number;
  triggerFailures: number;
  queueFailures: number;
}

class TriggerObservabilityManager {
  private metrics: TriggerMetricsSnapshot = {
    eventsReceived: 0,
    matchingAutomations: 0,
    executionsCreated: 0,
    executionsQueued: 0,
    duplicateSuppressed: 0,
    triggersIgnored: 0,
    triggerFailures: 0,
    queueFailures: 0,
  };

  /**
   * Log structured trigger event without leaking sensitive credentials.
   */
  log(payload: TriggerLogPayload): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...payload,
    };

    // Update in-memory counters
    switch (payload.action) {
      case 'automation.trigger.received':
        this.metrics.eventsReceived++;
        break;
      case 'automation.trigger.matched':
        this.metrics.matchingAutomations++;
        break;
      case 'automation.execution.created':
        this.metrics.executionsCreated++;
        break;
      case 'automation.execution.queued':
        this.metrics.executionsQueued++;
        break;
      case 'automation.trigger.duplicate':
        this.metrics.duplicateSuppressed++;
        break;
      case 'automation.trigger.ignored':
        this.metrics.triggersIgnored++;
        break;
      case 'automation.trigger.failed':
        this.metrics.triggerFailures++;
        break;
    }

    if (process.env.NODE_ENV !== 'test') {
      if (payload.action === 'automation.trigger.failed') {
        console.error(`[TriggerObservability] ${payload.action}:`, JSON.stringify(logEntry));
      } else {
        console.log(`[TriggerObservability] ${payload.action}:`, JSON.stringify(logEntry));
      }
    }
  }

  recordQueueFailure(): void {
    this.metrics.queueFailures++;
  }

  getMetrics(): TriggerMetricsSnapshot {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      eventsReceived: 0,
      matchingAutomations: 0,
      executionsCreated: 0,
      executionsQueued: 0,
      duplicateSuppressed: 0,
      triggersIgnored: 0,
      triggerFailures: 0,
      queueFailures: 0,
    };
  }
}

export const triggerObservability = new TriggerObservabilityManager();
