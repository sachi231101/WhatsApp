import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { bookingService } from '@/lib/services/bookingService';

export const dynamic = 'force-dynamic';

const DEFAULT_AGENTS = [
  {
    id: 'agent-support-01',
    name: 'Customer Support Specialist',
    description: 'Handles 24/7 FAQ inquiries, order lookups, returns, and store policies with instantaneous responses.',
    model: 'Gemini 2.0 Flash',
    tone: 'Friendly & Helpful',
    system_prompt: 'You are the official customer support AI for WazzApp. Greet customers politely, answer product and pricing inquiries accurately, and offer to transfer to a human specialist if an order issue requires verification.',
    is_active: true,
    conversations_handled: 842,
    satisfaction_rate: '96%',
  },
  {
    id: 'agent-sales-02',
    name: 'Inbound Lead Qualifier',
    description: 'Engages inbound prospects, captures company size & budget, and qualifies leads for sales outreach.',
    model: 'Claude 3.5 Sonnet',
    tone: 'Professional & Direct',
    system_prompt: 'You are an executive sales assistant. Ask targeted qualifying questions regarding team size, timeline, and use cases. Tag hot leads and schedule product demo calls.',
    is_active: true,
    conversations_handled: 418,
    satisfaction_rate: '92%',
  },
  {
    id: 'agent-tech-03',
    name: 'Tech & WhatsApp API Specialist',
    description: 'Assists developers with Meta Embedded Signup, webhook configuration, and API troubleshooting.',
    model: 'GPT-4o',
    tone: 'Technical & Concise',
    system_prompt: 'You are a Senior Solutions Architect helping developers integrate WhatsApp Business Cloud API. Provide code snippets, debugging advice, and webhook verification instructions.',
    is_active: false,
    conversations_handled: 129,
    satisfaction_rate: '98%',
  },
];

export const GET = withAuth(async function getAiAgents(_request: NextRequest, _session) {
  try {
    return NextResponse.json({ status: 'ok', data: DEFAULT_AGENTS });
  } catch (error) {
    console.error('Failed to get AI agents:', error);
    return NextResponse.json({ error: 'Failed to fetch AI agents' }, { status: 500 });
  }
});

export const POST = withAuth(async function testAgentReply(request: NextRequest, session) {
  try {
    const body = await request.json();
    const { message, agentId, contactName: inputName, phoneNumber: inputPhone } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const agent = DEFAULT_AGENTS.find((a) => a.id === agentId) || DEFAULT_AGENTS[0];
    const q = message.toLowerCase();
    const workspaceId = session.workspace.workspaceId;
    const userId = session.workspace.userId;

    // Check if the customer is requesting or agreeing to book a demo / meeting
    const isBookingConfirmation =
      q.includes('yes') ||
      q.includes('sure') ||
      q.includes('book') ||
      q.includes('schedule') ||
      q.includes('confirm') ||
      q.includes('works for me') ||
      q.includes('slot');

    const hasTimeOrDate =
      q.includes('tomorrow') ||
      q.includes('today') ||
      q.includes('pm') ||
      q.includes('am') ||
      q.includes('morning') ||
      q.includes('afternoon') ||
      /\b\d{1,2}(?::\d{2})?\b/.test(q);

    const isDirectBookingRequest =
      (isBookingConfirmation && hasTimeOrDate) ||
      q.includes('book demo') ||
      q.includes('schedule demo') ||
      q.includes('book a demo') ||
      q.includes('book a call') ||
      (q.includes('demo') && (q.includes('yes') || q.includes('sure') || q.includes('please') || hasTimeOrDate));

    if (isDirectBookingRequest) {
      // 1. Parse requested date & time
      const now = new Date();
      const targetDate = new Date(now);

      if (q.includes('day after tomorrow')) {
        targetDate.setDate(targetDate.getDate() + 2);
      } else if (q.includes('tomorrow') || !q.includes('today')) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // Extract time from query
      const timeMatch = q.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const meridiem = timeMatch[3];

        if (meridiem === 'pm' && hours < 12) {
          hours += 12;
        } else if (meridiem === 'am' && hours === 12) {
          hours = 0;
        } else if (!meridiem && hours >= 1 && hours <= 6) {
          hours += 12; // 1 to 6 assumed PM
        }
        targetDate.setHours(hours, minutes, 0, 0);
      } else {
        targetDate.setHours(14, 0, 0, 0); // Default 2:00 PM
      }

      // Extract name & phone
      let contactName = inputName || 'WhatsApp Customer';
      let phoneNumber = inputPhone || '+91 98765 43210';

      const nameMatch = message.match(/(?:for|with|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (nameMatch && !inputName) {
        contactName = nameMatch[1].trim();
      }

      const phoneMatch = message.match(/(\+?\d[\d\s\-]{8,14}\d)/);
      if (phoneMatch && !inputPhone) {
        phoneNumber = phoneMatch[1].replace(/\s+/g, '');
      }

      // 2. Call bookingService to check availability and book demo
      const bookingResult = await bookingService.createBooking({
        workspaceId,
        userId,
        contactName,
        phoneNumber,
        title: `WazzApp AI Demo — ${contactName}`,
        scheduledAt: targetDate,
        durationMinutes: 30,
        bookedBy: 'ai',
        autoBookNext: true,
        notes: `Automatically booked via WhatsApp AI Agent conversation. Customer message: "${message}"`,
      });

      if (bookingResult.success && bookingResult.booking) {
        const bookedDate = new Date(bookingResult.booking.scheduledAt);
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

        let simulatedReply = '';
        if (bookingResult.conflictResolved) {
          simulatedReply = `⚠️ *Slot Conflict Resolved!* 📅\n\nHello *${contactName}*, your requested slot was already reserved by another meeting. I searched for the next open business window and successfully secured *${timeFormatted}* on *${dateFormatted}* for you!\n\n🔗 *Google Meet:* ${bookingResult.booking.meetLink}\n\nOur solutions specialist has been notified and will meet you then. Looking forward to speaking with you!`;
        } else {
          simulatedReply = `🎉 *Demo Booked Successfully!* 📅\n\nHello *${contactName}*, your 30-minute product demo has been confirmed:\n\n📅 *Date:* ${dateFormatted}\n⏰ *Time:* ${timeFormatted} (30 mins)\n🔗 *Google Meet:* ${bookingResult.booking.meetLink}\n\nI have added this to our team calendar and sent you a confirmation. Looking forward to our call!`;
        }

        return NextResponse.json({
          status: 'ok',
          data: {
            reply: simulatedReply,
            isDemoBooked: true,
            conflictResolved: bookingResult.conflictResolved,
            booking: bookingResult.booking,
            model: agent.model,
            latencyMs: 280,
            tokensUsed: 112,
          },
        });
      }
    }

    // Standard AI responses with proactive qualification and demo invitation
    let simulatedReply = '';

    if (q.includes('price') || q.includes('cost') || q.includes('plan')) {
      simulatedReply = `Hi there! 👋 Our WazzApp AI plans start at ₹2,999/month for unlimited messaging, 5 AI agents, and complete Meta WhatsApp Business API integration.\n\nWould you like to schedule a quick 15-minute live product walkthrough? I have demo slots available tomorrow at 2:00 PM or 3:30 PM!`;
    } else if (q.includes('feature') || q.includes('whatsapp') || q.includes('can you') || q.includes('how does') || q.includes('what do you')) {
      simulatedReply = `WazzApp AI automates your entire WhatsApp sales & support funnel! 🚀 We handle 24/7 AI customer chat, team shared inbox, bulk Meta-approved broadcast campaigns, and automated calendar demo bookings.\n\nWould you like to schedule a quick 15-minute live walkthrough? Just reply with "Yes" or your preferred time tomorrow (e.g. "Tomorrow at 2 PM")!`;
    } else if (q.includes('demo') || q.includes('call') || q.includes('speak') || q.includes('walkthrough')) {
      simulatedReply = `I would love to arrange that! 📅 I have slots open tomorrow at 2:00 PM and 3:30 PM. Would either of those work for you, or do you prefer another time? Just reply with your preferred time!`;
    } else if (q.includes('human') || q.includes('agent') || q.includes('support')) {
      simulatedReply = `Understood! I am notifying our human customer success team right now. One of our specialists will take over this chat momentarily. 👤`;
    } else {
      simulatedReply = `Hello! 👋 Thank you for reaching out to WazzApp AI on WhatsApp. I can answer questions about our features, pricing, or book a live 15-minute product walkthrough for your team. How can I help you today?`;
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        reply: simulatedReply,
        isDemoBooked: false,
        model: agent.model,
        latencyMs: 320,
        tokensUsed: 84,
      },
    });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
});
