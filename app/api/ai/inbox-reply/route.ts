import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { sql } from '@/lib/db';
import { bookingService } from '@/lib/services/bookingService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/inbox-reply
 * Autonomous AI Agent response for WhatsApp conversations in Team Inbox.
 * Detects demo requests, offers demos on inquiries, checks slot collisions,
 * automatically secures slots, and inserts the outbound AI response.
 */
export const POST = withAuth(async function aiInboxReply(request: NextRequest, session) {
  try {
    const body = await request.json();
    const { conversationId, forceDemoBooking = false } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const workspaceId = session.workspace.workspaceId;
    const userId = session.workspace.userId;

    // 1. Fetch conversation details & contact info
    const { rows: convRows } = await sql`
      SELECT 
        c.id as conversation_id,
        c.workspace_id,
        c.whatsapp_phone_number_id,
        c.last_message_preview,
        ct.id as contact_id,
        ct.profile_name,
        ct.phone_number,
        p.phone_number_id
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN whatsapp_phone_numbers p ON c.whatsapp_phone_number_id = p.id
      WHERE c.id = ${conversationId} AND c.workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (convRows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = convRows[0];
    const contactName = conv.profile_name || 'Valued Client';
    const phoneNumber = conv.phone_number;
    const lastMessage = (conv.last_message_preview || '').toLowerCase();

    // 2. Detect intent: does the customer request a demo or confirm a booking?
    const hasBookingIntent =
      forceDemoBooking ||
      lastMessage.includes('demo') ||
      lastMessage.includes('call') ||
      lastMessage.includes('meeting') ||
      lastMessage.includes('book') ||
      lastMessage.includes('schedule') ||
      lastMessage.includes('tomorrow') ||
      lastMessage.includes('yes') ||
      lastMessage.includes('sure') ||
      lastMessage.includes('slot');

    let replyText = '';
    let isDemoBooked = false;
    let bookingData: any = null;
    let conflictResolved = false;

    if (hasBookingIntent) {
      // Parse or default to tomorrow at 2:00 PM
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);

      const timeMatch = lastMessage.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const meridiem = timeMatch[3];

        if (meridiem === 'pm' && hours < 12) hours += 12;
        else if (meridiem === 'am' && hours === 12) hours = 0;
        else if (!meridiem && hours >= 1 && hours <= 6) hours += 12;

        targetDate.setHours(hours, minutes, 0, 0);
      } else {
        targetDate.setHours(14, 0, 0, 0);
      }

      // Execute booking with intelligent conflict search
      const result = await bookingService.createBooking({
        workspaceId,
        userId,
        contactId: conv.contact_id,
        contactName,
        phoneNumber,
        title: `WazzApp AI Demo — ${contactName}`,
        scheduledAt: targetDate,
        durationMinutes: 30,
        bookedBy: 'ai',
        autoBookNext: true,
        notes: `Booked via WhatsApp Team Inbox AI Agent for conversation ${conversationId}`,
      });

      if (result.success && result.booking) {
        isDemoBooked = true;
        bookingData = result.booking;
        conflictResolved = Boolean(result.conflictResolved);

        const bookedDate = new Date(result.booking.scheduledAt);
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

        if (result.conflictResolved) {
          replyText = `⚠️ *Slot Conflict Resolved!* 📅\n\nHello *${contactName}*, your requested slot was already occupied. I checked our schedule and secured *${timeFormatted}* on *${dateFormatted}* for you!\n\n🔗 *Google Meet:* ${result.booking.meetLink}\n\nOur solutions specialist will meet you then. Looking forward to our call!`;
        } else {
          replyText = `🎉 *Demo Booked Successfully!* 📅\n\nHello *${contactName}*, your 30-minute product demo has been scheduled:\n\n📅 *Date:* ${dateFormatted}\n⏰ *Time:* ${timeFormatted} (30 mins)\n🔗 *Google Meet:* ${result.booking.meetLink}\n\nI have added this to our calendar and notified the team. See you then!`;
        }
      }
    } else {
      // General question -> Answer and ask for demo
      if (lastMessage.includes('price') || lastMessage.includes('cost')) {
        replyText = `Hi ${contactName}! 👋 Our WazzApp AI plans start at ₹2,999/month with unlimited messaging and 5 AI agents.\n\nWould you like to schedule a quick 15-minute product walkthrough? I have demo slots available tomorrow at 2:00 PM or 3:30 PM!`;
      } else {
        replyText = `Hello ${contactName}! 👋 WazzApp AI automates your WhatsApp marketing, shared inbox, and automated demo scheduling 24/7.\n\nWould you like to schedule a quick 15-minute live demo to see it in action? Just reply with your preferred time tomorrow!`;
      }
    }

    // 3. Insert outbound message into messages table
    const { rows: msgRows } = await sql`
      INSERT INTO messages (
        workspace_id,
        conversation_id,
        direction,
        sender_type,
        sender_id,
        type,
        body,
        status
      )
      VALUES (
        ${workspaceId},
        ${conversationId},
        'outbound',
        'ai_agent',
        ${userId || null},
        'text',
        ${replyText},
        'delivered'
      )
      RETURNING id, conversation_id, body, status, created_at, sender_type, direction
    `;

    // 4. Update conversation preview
    await sql`
      UPDATE conversations
      SET 
        last_message_preview = ${replyText.slice(0, 100)},
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId}
    `;

    return NextResponse.json({
      status: 'ok',
      data: {
        message: msgRows[0],
        replyText,
        isDemoBooked,
        conflictResolved,
        booking: bookingData,
      },
    });
  } catch (error) {
    console.error('Error in /api/ai/inbox-reply:', error);
    return NextResponse.json({ error: 'AI inbox reply failed' }, { status: 500 });
  }
});
