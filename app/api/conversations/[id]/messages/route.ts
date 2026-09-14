import { type NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';
import { withAuth } from '@/app/api/authWrapper';
import { messageService } from '@/lib/services/messaging/messageService';
import { send } from '@/app/api/beUtils';
import { sql } from '@vercel/postgres';
import privateConfig from '@/app/privateConfig';
import { decrypt } from '@/lib/crypto/encryption';

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

    // 1. Fetch conversation with contact + phone number details
    // Try via project's whatsapp_connections (primary path for new tenants)
    const { rows: convRows } = await sql`
      SELECT
        c.id,
        c.workspace_id,
        c.project_id,
        ct.wa_id,
        ct.phone_number,
        -- Phone number ID from whatsapp_connections (via project)
        wconn.phone_number_id AS wconn_phone_number_id,
        wconn.encrypted_access_token AS wconn_token,
        wconn.token_iv AS wconn_iv,
        wconn.token_tag AS wconn_tag,
        -- Phone number ID from whatsapp_phone_numbers (via whatsapp_phone_number_id on conv)
        wpn.phone_number_id AS wpn_phone_number_id,
        wa.encrypted_access_token AS wa_token,
        wa.token_iv AS wa_iv,
        wa.token_tag AS wa_tag
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN whatsapp_phone_numbers wpn ON c.whatsapp_phone_number_id = wpn.id
      LEFT JOIN whatsapp_accounts wa ON wpn.whatsapp_account_id = wa.id
      LEFT JOIN whatsapp_connections wconn ON c.project_id = wconn.project_id AND wconn.status = 'CONNECTED'
      WHERE c.id = ${conversationId} AND c.workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (convRows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = convRows[0];

    // Resolve phone_number_id: prefer whatsapp_connections, fallback to whatsapp_phone_numbers
    const phoneNumberId: string | null =
      conv.wconn_phone_number_id || conv.wpn_phone_number_id ||
      process.env.WHATSAPP_PHONE_NUMBER_ID || null;

    const destPhone = conv.wa_id || conv.phone_number;

    // 2. Persist outbound message in DB as pending
    const { rows: msgRows } = await sql`
      INSERT INTO messages (
        workspace_id, project_id, conversation_id,
        direction, sender_type, sender_id, type, body, status
      )
      VALUES (
        ${workspaceId}, ${conv.project_id || null}, ${conversationId},
        'outbound', 'user', ${session.workspace.userId || null}, ${type}, ${text}, 'pending'
      )
      RETURNING id, workspace_id, project_id, conversation_id, direction, sender_type, type, body, status, created_at
    `;
    const savedMessage = msgRows[0];

    // Update conversation last_message_preview
    await sql`
      UPDATE conversations
      SET last_message_preview = ${text.slice(0, 100)},
          last_message_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // 3. Resolve Meta access token
    let accessToken: string | null = null;
    try {
      // Try whatsapp_connections token first (most reliable for new tenants)
      if (conv.wconn_token && conv.wconn_iv && conv.wconn_tag) {
        accessToken = decrypt({ iv: conv.wconn_iv, tag: conv.wconn_tag, ciphertext: conv.wconn_token });
      } else if (conv.wa_token && conv.wa_iv && conv.wa_tag) {
        accessToken = decrypt({ iv: conv.wa_iv, tag: conv.wa_tag, ciphertext: conv.wa_token });
      }
    } catch (decErr) {
      console.warn('[sendMessage] Token decrypt failed:', decErr);
    }

    // Fallback to env access token
    if (!accessToken) {
      accessToken = process.env.WHATSAPP_ACCESS_TOKEN || null;
    }

    // 4. Dispatch to Meta Graph API
    let metaMessageId: string | null = null;
    if (accessToken && phoneNumberId && destPhone) {
      try {
        const metaRes = await send(phoneNumberId, accessToken, destPhone, text);
        metaMessageId = metaRes?.messages?.[0]?.id || null;
      } catch (graphErr: any) {
        console.error('[sendMessage] Meta Graph API error:', graphErr?.message || graphErr);
      }
    } else {
      console.warn('[sendMessage] Skipping Meta send: missing token/phoneNumberId/destPhone', {
        hasToken: Boolean(accessToken),
        phoneNumberId,
        destPhone,
      });
    }

    // 5. Update message with meta_message_id + sent status
    const finalStatus = metaMessageId ? 'sent' : 'pending';
    const { rows: updatedRows } = await sql`
      UPDATE messages
      SET
        meta_message_id = ${metaMessageId},
        external_message_id = ${metaMessageId},
        status = ${finalStatus},
        sent_at = CASE WHEN ${metaMessageId} IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ${savedMessage.id}
      RETURNING id, workspace_id, project_id, conversation_id, direction, sender_type, type, body, status, meta_message_id, created_at
    `;
    const finalMessage = updatedRows[0] || savedMessage;

    // 6. Broadcast to Ably realtime channel
    try {
      const { ablyKey } = await privateConfig();
      if (ablyKey) {
        const ably = new Ably.Realtime({ key: ablyKey, clientId: 'server_outbound' });
        const channel = ably.channels.get(`workspace:${workspaceId}:inbox`);
        await channel.publish('message:new', { conversationId, message: finalMessage });
        ably.close();
      }
    } catch (ablyErr) {
      console.warn('[sendMessage] Ably broadcast error:', ablyErr);
    }

    return NextResponse.json({ status: 'ok', data: finalMessage });
  } catch (error) {
    console.error('[sendMessage] Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
});


