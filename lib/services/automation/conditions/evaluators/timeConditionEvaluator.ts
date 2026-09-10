import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function normalizeDayToken(day: unknown): string | null {
  if (typeof day === 'number') {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday, 7 = Sunday
    if (day === 7 || day === 0) return 'SUNDAY';
    if (day >= 1 && day <= 6) return DAY_NAMES[day];
    return null;
  }
  if (typeof day === 'string') {
    const s = day.toUpperCase().trim();
    if (DAY_NAMES.includes(s)) return s;
    const num = Number(s);
    if (!isNaN(num)) return normalizeDayToken(num);
  }
  return null;
}

export class TimeConditionEvaluator implements ConditionEvaluator {
  readonly type = 'TIME_CONDITION';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const timezone = configuration.timezone || 'UTC';

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return {
        matched: false,
        branch: 'NO',
        reason: `Invalid IANA timezone: "${timezone}"`,
        errorCode: 'INVALID_TIMEZONE',
      };
    }

    const eventDate = context.occurredAt ? new Date(context.occurredAt) : new Date();
    if (isNaN(eventDate.getTime())) {
      return {
        matched: false,
        branch: 'NO',
        reason: `Invalid execution timestamp: "${context.occurredAt}"`,
        errorCode: 'INVALID_DATE',
      };
    }

    // Format current date in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(eventDate);
    const weekday = (parts.find((p) => p.type === 'weekday')?.value || '').toUpperCase();
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '00';
    const minuteStr = parts.find((p) => p.type === 'minute')?.value || '00';

    const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);
    const currentTimeFormatted = `${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}`;

    // 1. Evaluate Day of Week
    const rawDays = configuration.days || configuration.workingDays;
    let dayMatched = true;

    if (Array.isArray(rawDays) && rawDays.length > 0) {
      const allowedDays = rawDays.map(normalizeDayToken).filter(Boolean) as string[];
      dayMatched = allowedDays.includes(weekday);
    }

    // 2. Evaluate Time Window
    const startTimeStr = configuration.startTime || configuration.businessHours?.start;
    const endTimeStr = configuration.endTime || configuration.businessHours?.end;
    let timeMatched = true;

    if (startTimeStr && endTimeStr) {
      const startMinutes = parseTimeToMinutes(startTimeStr);
      const endMinutes = parseTimeToMinutes(endTimeStr);

      if (startMinutes <= endMinutes) {
        // Standard window (e.g. 09:00 -> 18:00)
        timeMatched = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Overnight window (e.g. 22:00 -> 06:00)
        timeMatched = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } else if (startTimeStr) {
      const startMinutes = parseTimeToMinutes(startTimeStr);
      timeMatched = currentMinutes >= startMinutes;
    } else if (endTimeStr) {
      const endMinutes = parseTimeToMinutes(endTimeStr);
      timeMatched = currentMinutes <= endMinutes;
    }

    const matched = dayMatched && timeMatched;

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: {
        weekday,
        time: currentTimeFormatted,
        timezone,
      },
      operator: 'within_window',
      metadata: {
        timezone,
        currentWeekday: weekday,
        currentTime: currentTimeFormatted,
        dayMatched,
        timeMatched,
        configuredDays: rawDays,
        startTime: startTimeStr,
        endTime: endTimeStr,
      },
    };
  }
}
