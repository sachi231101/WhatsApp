import {
  getAutomationScheduleQueue,
  testRegisteredSchedules,
  type AutomationScheduleJobData,
} from '@/lib/queue/automationScheduleQueue';
import { publishDomainEvent } from '@/lib/events/domainEvent';

export class AutomationScheduleService {
  /**
   * Register a repeatable BullMQ schedule job for an active automation.
   */
  async registerSchedule(options: {
    workspaceId: string;
    projectId: string;
    automationId: string;
    automationVersionId: string;
    cron: string;
    timezone?: string;
  }): Promise<boolean> {
    const {
      workspaceId,
      projectId,
      automationId,
      automationVersionId,
      cron,
      timezone = 'UTC',
    } = options;

    const data: AutomationScheduleJobData = {
      automationId,
      automationVersionId,
      workspaceId,
      projectId,
      cron,
      timezone,
    };

    // Track in test harness
    testRegisteredSchedules.set(automationId, {
      automationId,
      data,
      active: true,
    });

    const queue = getAutomationScheduleQueue();
    if (!queue) {
      return true;
    }

    try {
      // Remove any existing repeatable job for this automation first
      await this.unregisterSchedule(automationId);

      await (queue as any).add('trigger-schedule', data, {
        jobId: `schedule-${automationId}`,
        repeat: {
          pattern: cron,
          tz: timezone,
        },
      });
      return true;
    } catch (err) {
      console.error(`[AutomationScheduleService] Failed to register schedule for ${automationId}:`, err);
      return false;
    }
  }

  /**
   * Unregister / disable repeatable schedule for an automation when paused or archived.
   */
  async unregisterSchedule(automationId: string): Promise<boolean> {
    // Update test harness
    if (testRegisteredSchedules.has(automationId)) {
      testRegisteredSchedules.get(automationId)!.active = false;
      testRegisteredSchedules.delete(automationId);
    }

    const queue = getAutomationScheduleQueue();
    if (!queue) {
      return true;
    }

    try {
      const repeatableJobs = await (queue as any).getRepeatableJobs?.();
      if (Array.isArray(repeatableJobs)) {
        for (const job of repeatableJobs) {
          if (job.id === `schedule-${automationId}` || job.name === 'trigger-schedule') {
            await (queue as any).removeRepeatableByKey?.(job.key);
          }
        }
      }
      return true;
    } catch (err) {
      console.warn(`[AutomationScheduleService] Error removing repeatable schedule for ${automationId}:`, err);
      return false;
    }
  }

  /**
   * Emits a scheduled.trigger domain event when a scheduled job fires.
   */
  async fireScheduledTrigger(data: AutomationScheduleJobData): Promise<void> {
    const eventId = `sched-${data.automationId}-${Date.now()}`;
    await publishDomainEvent({
      id: eventId,
      type: 'scheduled.trigger',
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      occurredAt: new Date().toISOString(),
      payload: {
        automationId: data.automationId,
        automationVersionId: data.automationVersionId,
        scheduledAt: new Date().toISOString(),
        timezone: data.timezone,
        cron: data.cron,
      },
      metadata: {
        source: 'scheduler',
      },
    });
  }
}

export const automationScheduleService = new AutomationScheduleService();
