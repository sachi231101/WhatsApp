import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { bookingService } from '@/lib/services/bookingService';

export const dynamic = 'force-dynamic';

interface ParsedIntent {
  contactName: string;
  phoneNumber: string;
  targetDate: Date;
  title: string;
}

/**
 * Intelligent helper to parse natural language or fallback to structured input
 */
function parseBookingRequest(
  message: string,
  explicitName?: string,
  explicitPhone?: string,
  explicitDate?: string,
): ParsedIntent {
  const now = new Date();
  let targetDate = new Date(now);

  // If explicit ISO/datetime is given, use it
  if (explicitDate) {
    const d = new Date(explicitDate);
    if (!isNaN(d.getTime())) {
      targetDate = d;
    }
  } else {
    // Basic NLP extraction for demo day
    const lower = message.toLowerCase();

    if (lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('day after tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 2);
    } else {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < days.length; i++) {
        if (lower.includes(days[i])) {
          const currentDay = targetDate.getDay();
          let diff = i - currentDay;
          if (diff <= 0) diff += 7;
          targetDate.setDate(targetDate.getDate() + diff);
          break;
        }
      }
    }

    // NLP extraction for time (e.g., "3pm", "3:30 pm", "11:00 am", "15:00")
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3];

      if (meridiem === 'pm' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      } else if (!meridiem && hours >= 1 && hours <= 6) {
        // Assume afternoon for 1 to 6
        hours += 12;
      }

      targetDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to next nearest hour during business hours
      targetDate.setHours(14, 0, 0, 0);
    }
  }

  // Extract phone number if not explicitly passed
  let phoneNumber = explicitPhone || '+91 98765 43210';
  const phoneMatch = message.match(/(\+?\d[\d\s\-]{8,14}\d)/);
  if (phoneMatch && !explicitPhone) {
    phoneNumber = phoneMatch[1].replace(/\s+/g, '');
  }

  // Extract contact name if not explicitly passed
  let contactName = explicitName || 'Prospective Client';
  if (!explicitName) {
    const nameMatch = message.match(/(?:with|for|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) {
      contactName = nameMatch[1].trim();
    }
  }

  return {
    contactName,
    phoneNumber,
    targetDate,
    title: `WazzApp AI Demo — ${contactName}`,
  };
}

export const POST = withAuth(async function aiBookDemo(request: NextRequest, session) {
  try {
    const body = await request.json();
    const workspaceId = session.workspace.workspaceId;
    const userId = session.workspace.userId;

    const {
      message = '',
      contactName: inputName,
      phoneNumber: inputPhone,
      contactEmail,
      scheduledAt: inputDate,
      autoBookNext = true,
      notes,
    } = body;

    const steps: string[] = [];
    steps.push('🤖 Received AI demo booking request.');

    // 1. Parse intent
    const parsed = parseBookingRequest(message, inputName, inputPhone, inputDate);
    steps.push(`Target attendee: ${parsed.contactName} (${parsed.phoneNumber})`);
    steps.push(`Requested slot: ${parsed.targetDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`);

    // 2. Perform booking with conflict resolution
    steps.push('🔍 Verifying calendar slot availability in workspace database...');
    const result = await bookingService.createBooking({
      workspaceId,
      userId,
      contactName: parsed.contactName,
      phoneNumber: parsed.phoneNumber,
      contactEmail,
      title: parsed.title,
      scheduledAt: parsed.targetDate,
      durationMinutes: 30,
      bookedBy: 'ai',
      autoBookNext,
      notes: notes || `Booked via AI Assistant prompt: "${message || 'Direct Assistant Booking'}"`,
    });

    if (!result.success && result.conflict) {
      steps.push('⚠️ Requested slot is occupied and auto-book was disabled.');
      return NextResponse.json({
        status: 'conflict',
        data: {
          ...result,
          steps,
          conversationalReply: `⚠️ The requested slot for ${parsed.contactName} is currently unavailable. Would you like to select one of the following available slots: ${result.alternativeSlots?.map((s) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).join(', ')}?`,
        },
      });
    }

    const booking = result.booking!;
    const bookedDate = new Date(booking.scheduledAt);
    const dateFormatted = bookedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = bookedDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let conversationalReply = '';

    if (result.conflictResolved) {
      steps.push(`⚠️ Conflict detected: Original slot was full.`);
      steps.push(`🔍 AI searched forward and secured next available slot: ${timeFormatted}.`);
      steps.push(`📅 Demo saved to database (ID: ${booking.id.slice(0, 8)}).`);
      steps.push(`🔔 Dispatched real-time notification to team dashboard.`);

      conversationalReply = `⚠️ *Slot Conflict Automatically Resolved!*\n\nHello *${parsed.contactName}*, your original requested slot was occupied. I searched for the next open business slot and secured:\n\n📅 *Date:* ${dateFormatted}\n⏰ *Time:* ${timeFormatted} (30 mins)\n🔗 *Meeting Link:* ${booking.meetLink}\n\nNotification has been posted to your team's dashboard.`;
    } else {
      steps.push(`✅ Slot was open! Demo reserved successfully.`);
      steps.push(`📅 Demo saved to database (ID: ${booking.id.slice(0, 8)}).`);
      steps.push(`🔔 Dispatched real-time notification to team dashboard.`);

      conversationalReply = `🎉 *Demo Confirmed with WazzApp AI!*\n\nHello *${parsed.contactName}*, your product demo has been scheduled:\n\n📅 *Date:* ${dateFormatted}\n⏰ *Time:* ${timeFormatted} (30 mins)\n🔗 *Meeting Link:* ${booking.meetLink}\n\nA calendar invite and WhatsApp confirmation have been dispatched.`;
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        ...result,
        steps,
        conversationalReply,
      },
    });
  } catch (error) {
    console.error('Error in /api/ai/book-demo:', error);
    return NextResponse.json({ error: 'AI demo booking failed' }, { status: 500 });
  }
});
