import { type NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';
import { withAuth } from '@/app/api/authWrapper';
import { messageService } from '@/lib/services/messaging/messageService';
import { send, getTokenForWaba } from '@/app/api/beUtils';
import { sql } from '@vercel/postgres';
import privateConfig from '@/app/privateConfig';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async function getMessages(
  request: NextRequest,
  session,
) {
  try {
    const url = new URL(request.url);
    // Extract ID from pathname: /api/conversations/[id]/messages
    const pathParts = url.pathname.split('/');
    const conversationId = pathParts[pathParts.indexOf('conversations') + 1];

    const workspaceId = session.workspace.workspaceId;

    const messages = await messageService.getMessages(conversationId, workspaceId);
    await messageService.markConversationRead(conversationId, workspaceId);

    return NextResponse.json({ status: 'ok', data: messages });
  } catch (error) {
    console.error('Failed to get conversation messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
});

export const POST = withAuth(async function sendMessage(
  request: NextRequest,
  session,
) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const conversationId = pathParts[pathParts.indexOf('conversations') + 1];

    const body = await request.json();
    const { text, type = 'text' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const workspaceId = session.workspace.workspaceId;

    // 1. Fetch conversation with phone number and contact details
    const { rows: convRows } = await sql`
      SELECT 
        c.id, c.workspace_id,
        ct.wa_id, ct.phone_number,
        p.phone_number_id,
        w.waba_id, w.access_token as plain_token,
        wa.encrypted_access_token
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      JOIN whatsapp_phone_numbers p ON c.whatsapp_phone_number_id = p.id
      LEFT JOIN whatsapp_accounts wa ON p.whatsapp_account_id = wa.id
      LEFT JOIN wabas w ON wa.waba_id = CAST(w.waba_id AS VARCHAR)
      WHERE c.id = ${conversationId} AND c.workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (convRows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = convRows[0];
    const phoneNumberId = conv.phone_number_id;
    const destPhone = conv.phone_number;

    // 2. Persist message record in DB as pending
    const outboundRecord = await messageService.recordOutboundMessage({
      workspaceId,
      phoneNumberId,
      destPhone,
      body: text,
      type,
      senderType: 'user',
      senderId: session.workspace.userId,
    });

    // 3. Resolve Meta token
    let accessToken: string;
    try {
      if (conv.waba_id) {
        accessToken = await getTokenForWaba(conv.waba_id, session.user.email!);
      } else {
        const { rows: wabaRows } = await sql`SELECT access_token FROM wabas LIMIT 1`;
        accessToken = wabaRows[0]?.access_token;
      }
    } catch {
      const { rows: wabaRows } = await sql`SELECT access_token FROM wabas LIMIT 1`;
      accessToken = wabaRows[0]?.access_token;
    }

    // 4. Dispatch to Meta Graph API if access token is available
    if (accessToken) {
      try {
        const metaRes = await send(phoneNumberId, accessToken, destPhone, text);
        const metaMessageId = metaRes.messages?.[0]?.id;
        if (metaMessageId && outboundRecord.message?.id) {
          await messageService.attachMetaMessageId(outboundRecord.message.id, metaMessageId);
        }
      } catch (graphErr) {
        console.error('Meta Graph API send error:', graphErr);
        // Message is still saved in DB with pending/failed state
      }
    }

    // 5. Broadcast to workspace realtime channel via Ably
    try {
      const { ablyKey } = await privateConfig();
      if (ablyKey) {
        const ably = new Ably.Realtime({ key: ablyKey, clientId: 'server_outbound' });
        const channel = ably.channels.get(`workspace:${workspaceId}:inbox`);
        await channel.publish('message:new', {
          conversationId,
          message: outboundRecord.message,
        });
        ably.close();
      }
    } catch (ablyErr) {
      console.warn('Realtime broadcast error:', ablyErr);
    }

    return NextResponse.json({ status: 'ok', data: outboundRecord.message });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
});
