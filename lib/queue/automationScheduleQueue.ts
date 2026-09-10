import { Queue } from 'bullmq';
import { getRedisOptions } from './redis';

export const AUTOMATION_SCHEDULE_QUEUE_NAME = 'automation-schedules';

export interface AutomationScheduleJobData {
  automationId: string;
  automationVersionId: string;
  workspaceId: string;
  projectId: string;
  cron: string;
  timezone: string;
}

export interface MockScheduleJob {
  automationId: string;
  data: AutomationScheduleJobData;
  active: boolean;
}

export const testRegisteredSchedules: Map<string, MockScheduleJob> = new Map();

export function clearTestSchedules(): void {
  testRegisteredSchedules.clear();
}

let scheduleQueueInstance: Queue<AutomationScheduleJobData> | null = null;

export function getAutomationScheduleQueue(): Queue<AutomationScheduleJobData> | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!scheduleQueueInstance) {
    try {
      scheduleQueueInstance = new Queue<AutomationScheduleJobData>(
        AUTOMATION_SCHEDULE_QUEUE_NAME,
        {
          connection: getRedisOptions(),
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        }
      );
    } catch (err) {
      console.warn('[AutomationScheduleQueue] Could not initialize BullMQ schedule queue:', err);
      scheduleQueueInstance = null;
    }
  }

  return scheduleQueueInstance;
}
