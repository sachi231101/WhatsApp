import { sql } from '@vercel/postgres';
import { ensureCoreTables } from '@/lib/auth/context';

export interface InboundMessageParams {
  phoneNumberId: string;
  wabaId: string;
  from: string; // Consumer WA ID / Phone number
  contactName?: string;
  body: string;
  caption?: string;
  mediaUrl?: string;
  metaMessageId?: string;
  type?: string;
  timestamp?: number;
}

export interface OutboundMessageParams {
  workspaceId: string;
  phoneNumberId: string;
  destPhone: string;
  body: string;
  type?: string;
  senderType?: 'user' | 'ai_agent' | 'system';
  senderId?: string;
}

export class MessageService {
  /**
   * Process and persist an inbound message received via Meta Webhook
   */
  async recordInboundMessage(params: InboundMessageParams) {
    await ensureCoreTables();
    const {
      phoneNumberId,
      from,
      contactName,
      body,
      caption,
      mediaUrl,
      metaMessageId,
      type = 'text',
      timestamp = Date.now(),
    } = params;

    // 1. Resolve workspace_id from whatsapp_phone_numbers or fallback to default workspace
    const { rows: phoneRows } = await sql`
      SELECT id, workspace_id FROM whatsapp_phone_numbers WHERE phone_number_id = ${phoneNumberId} LIMIT 1
    `;

    let workspaceId: string;
    let phoneRecordId: string;

    if (phoneRows.length > 0) {
      workspaceId = phoneRows[0].workspace_id;
      phoneRecordId = phoneRows[0].id;
    } else {
      // Find or create default workspace record for this phone number
      const { rows: wsRows } = await sql`SELECT id FROM workspaces LIMIT 1`;
      workspaceId = wsRows[0]?.id || '00000000-0000-0000-0000-000000000002';

      const { rows: newPhone } = await sql`
        INSERT INTO whatsapp_phone_numbers (workspace_id, phone_number_id, display_phone_number, status)
        VALUES (${workspaceId}, ${phoneNumberId}, ${phoneNumberId}, 'CONNECTED')
        ON CONFLICT (phone_number_id) DO UPDATE SET status = 'CONNECTED'
        RETURNING id
      `;
      phoneRecordId = newPhone[0].id;
    }

    // 2. Find or create Contact
    const { rows: contactRows } = await sql`
      INSERT INTO contacts (workspace_id, wa_id, phone_number, profile_name)
      VALUES (${workspaceId}, ${from}, ${from}, ${contactName || from})
      ON CONFLICT (workspace_id, wa_id) DO UPDATE SET
        profile_name = COALESCE(EXCLUDED.profile_name, contacts.profile_name),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, profile_name, phone_number
    `;
    const contact = contactRows[0];

    // 3. Find or create Conversation
    const windowExpiresAt = new Date(timestamp + 24 * 60 * 60 * 1000).toISOString();
    const { rows: convRows } = await sql`
      INSERT INTO conversations (
        workspace_id, whatsapp_phone_number_id, contact_id, 
        status, last_message_preview, last_message_at, unread_count, window_expires_at
      )
      VALUES (
        ${workspaceId}, ${phoneRecordId}, ${contact.id},
        'open', ${body.slice(0, 100)}, CURRENT_TIMESTAMP, 1, ${windowExpiresAt}
      )
      ON CONFLICT (workspace_id, whatsapp_phone_number_id, contact_id) DO UPDATE SET
        last_message_preview = EXCLUDED.last_message_preview,
        last_message_at = CURRENT_TIMESTAMP,
        unread_count = conversations.unread_count + 1,
        window_expires_at = EXCLUDED.window_expires_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, status, unread_count
    `;
    const conversation = convRows[0];

    // 4. Insert Message (idempotent on meta_message_id)
    const { rows: msgRows } = await sql`
      INSERT INTO messages (
        workspace_id, conversation_id, meta_message_id,
        direction, sender_type, type, body, caption, media_url, status, created_at
      )
      VALUES (
        ${workspaceId}, ${conversation.id}, ${metaMessageId || null},
        'inbound', 'customer', ${type}, ${body}, ${caption || null}, ${mediaUrl || null}, 'delivered', TO_TIMESTAMP(${timestamp / 1000})
      )
      ON CONFLICT (meta_message_id) DO NOTHING
      RETURNING id, meta_message_id, body, caption, media_url, type, status, created_at
    `;

    return {
      workspaceId,
      conversationId: conversation.id,
      contact,
      message: msgRows[0],
    };
  }

  /**
   * Persist an outbound message sent by an operator or AI agent
   */
  async recordOutboundMessage(params: OutboundMessageParams) {
    await ensureCoreTables();
    const {
      workspaceId,
      phoneNumberId,
      destPhone,
      body,
      type = 'text',
      senderType = 'user',
      senderId,
    } = params;

    // 1. Resolve phone
    const { rows: phoneRows } = await sql`
      SELECT id FROM whatsapp_phone_numbers WHERE phone_number_id = ${phoneNumberId} AND workspace_id = ${workspaceId} LIMIT 1
    `;
    let phoneRecordId = phoneRows[0]?.id;
    if (!phoneRecordId) {
      const { rows: newPhone } = await sql`
        INSERT INTO whatsapp_phone_numbers (workspace_id, phone_number_id, display_phone_number, status)
        VALUES (${workspaceId}, ${phoneNumberId}, ${phoneNumberId}, 'CONNECTED')
        ON CONFLICT (phone_number_id) DO UPDATE SET status = 'CONNECTED'
        RETURNING id
      `;
      phoneRecordId = newPhone[0].id;
    }

    // 2. Find or create Contact
    const { rows: contactRows } = await sql`
      INSERT INTO contacts (workspace_id, wa_id, phone_number, profile_name)
      VALUES (${workspaceId}, ${destPhone}, ${destPhone}, ${destPhone})
      ON CONFLICT (workspace_id, wa_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id, profile_name, phone_number
    `;
    const contact = contactRows[0];

    // 3. Upsert Conversation
    const { rows: convRows } = await sql`
      INSERT INTO conversations (
        workspace_id, whatsapp_phone_number_id, contact_id, 
        status, last_message_preview, last_message_at, unread_count
      )
      VALUES (
        ${workspaceId}, ${phoneRecordId}, ${contact.id},
        'open', ${body.slice(0, 100)}, CURRENT_TIMESTAMP, 0
      )
      ON CONFLICT (workspace_id, whatsapp_phone_number_id, contact_id) DO UPDATE SET
        last_message_preview = EXCLUDED.last_message_preview,
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    const conversation = convRows[0];

    // 4. Insert Message as 'pending'
    const { rows: msgRows } = await sql`
      INSERT INTO messages (
        workspace_id, conversation_id, direction, sender_type,
        sender_id, type, body, status
      )
      VALUES (
        ${workspaceId}, ${conversation.id}, 'outbound', ${senderType},
        ${senderId || null}, ${type}, ${body}, 'pending'
      )
      RETURNING id, conversation_id, body, status, created_at
    `;

    return {
      conversationId: conversation.id,
      message: msgRows[0],
      contact,
    };
  }

  /**
   * Update delivery status of a sent message based on Meta delivery webhooks
   */
  async updateMessageStatus(metaMessageId: string, status: 'sent' | 'delivered' | 'read' | 'failed', errorMsg?: string) {
    await ensureCoreTables();
    const { rows } = await sql`
      UPDATE messages
      SET status = ${status},
          error_message = COALESCE(${errorMsg || null}, error_message)
      WHERE meta_message_id = ${metaMessageId}
      RETURNING id, workspace_id, conversation_id, meta_message_id, status, error_message
    `;
    return rows[0] || null;
  }

  /**
   * Attach Meta's returned message_id to our pending outbound record
   */
  async attachMetaMessageId(messageId: string, metaMessageId: string) {
    return await sql`
      UPDATE messages
      SET meta_message_id = ${metaMessageId},
          status = 'sent'
      WHERE id = ${messageId}
    `;
  }

  /**
   * Fetch all conversations for a workspace
   */
  async getConversations(workspaceId: string, status?: string) {
    await ensureCoreTables();
    if (status && status !== 'all') {
      const { rows } = await sql`
        SELECT 
          c.id, c.status, c.last_message_preview, c.last_message_at, c.unread_count, c.window_expires_at,
          ct.wa_id, ct.phone_number, ct.profile_name, ct.avatar_url,
          p.display_phone_number as business_number, p.phone_number_id
        FROM conversations c
        JOIN contacts ct ON c.contact_id = ct.id
        JOIN whatsapp_phone_numbers p ON c.whatsapp_phone_number_id = p.id
        WHERE c.workspace_id = ${workspaceId} AND c.status = ${status}
        ORDER BY c.last_message_at DESC
      `;
      return rows;
    }

    let { rows } = await sql`
      SELECT 
        c.id, c.status, c.last_message_preview, c.last_message_at, c.unread_count, c.window_expires_at,
        ct.wa_id, ct.phone_number, ct.profile_name, ct.avatar_url,
        p.display_phone_number as business_number, p.phone_number_id
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      JOIN whatsapp_phone_numbers p ON c.whatsapp_phone_number_id = p.id
      WHERE c.workspace_id = ${workspaceId}
      ORDER BY c.last_message_at DESC
    `;

    if (rows.length === 0) {
      await this.seedDemoConversationsIfEmpty(workspaceId);
      const res = await sql`
        SELECT 
          c.id, c.status, c.last_message_preview, c.last_message_at, c.unread_count, c.window_expires_at,
          ct.wa_id, ct.phone_number, ct.profile_name, ct.avatar_url,
          p.display_phone_number as business_number, p.phone_number_id
        FROM conversations c
        JOIN contacts ct ON c.contact_id = ct.id
        JOIN whatsapp_phone_numbers p ON c.whatsapp_phone_number_id = p.id
        WHERE c.workspace_id = ${workspaceId}
        ORDER BY c.last_message_at DESC
      `;
      rows = res.rows;
    }

    return rows;
  }

  /**
   * Seed demo conversations for empty workspaces to provide immediate interactive experience
   */
  async seedDemoConversationsIfEmpty(workspaceId: string) {
    try {
      const { rows: phoneRows } = await sql`
        INSERT INTO whatsapp_phone_numbers (workspace_id, phone_number_id, display_phone_number, verified_name, status, is_calling_enabled)
        VALUES (${workspaceId}, 'demo_phone_1001', '+1 (555) 019-2834', 'WazzApp AI Business', 'CONNECTED', true)
        ON CONFLICT (phone_number_id) DO UPDATE SET status = 'CONNECTED'
        RETURNING id
      `;
      const phoneId = phoneRows[0]?.id;
      if (!phoneId) return;

      const { rows: c1 } = await sql`
        INSERT INTO contacts (workspace_id, wa_id, phone_number, first_name, last_name, profile_name, custom_attributes)
        VALUES (${workspaceId}, '+919876543210', '+919876543210', 'Rahul', 'Sharma', 'Rahul Sharma', '{"stage":"hot_lead","score":87,"tag":"Hot Lead"}')
        ON CONFLICT (workspace_id, wa_id) DO UPDATE SET profile_name = 'Rahul Sharma'
        RETURNING id
      `;
      const { rows: conv1 } = await sql`
        INSERT INTO conversations (workspace_id, whatsapp_phone_number_id, contact_id, status, last_message_preview, last_message_at, unread_count, window_expires_at)
        VALUES (${workspaceId}, ${phoneId}, ${c1[0].id}, 'open', 'What is the pricing for 5 AI agents?', NOW() - INTERVAL '2 minutes', 1, NOW() + INTERVAL '23 hours')
        ON CONFLICT (workspace_id, whatsapp_phone_number_id, contact_id) DO UPDATE SET last_message_preview = 'What is the pricing for 5 AI agents?'
        RETURNING id
      `;
      await sql`
        INSERT INTO messages (workspace_id, conversation_id, direction, sender_type, type, body, status, created_at)
        VALUES 
        (${workspaceId}, ${conv1[0].id}, 'inbound', 'customer', 'text', 'Hi, I would like to learn more about WazzApp AI features.', 'delivered', NOW() - INTERVAL '15 minutes'),
        (${workspaceId}, ${conv1[0].id}, 'outbound', 'user', 'text', 'Hello Rahul! Welcome. We offer automated AI agents, team inbox, and multi-tenant WhatsApp integration.', 'read', NOW() - INTERVAL '10 minutes'),
        (${workspaceId}, ${conv1[0].id}, 'inbound', 'customer', 'text', 'What is the pricing for 5 AI agents?', 'delivered', NOW() - INTERVAL '2 minutes')
        ON CONFLICT DO NOTHING
      `;

      const { rows: c2 } = await sql`
        INSERT INTO contacts (workspace_id, wa_id, phone_number, first_name, last_name, profile_name, custom_attributes)
        VALUES (${workspaceId}, '+919811122233', '+919811122233', 'Priya', 'Mehta', 'Priya Mehta', '{"stage":"opportunity","score":64,"tag":"AI Qualified"}')
        ON CONFLICT (workspace_id, wa_id) DO UPDATE SET profile_name = 'Priya Mehta'
        RETURNING id
      `;
      const { rows: conv2 } = await sql`
        INSERT INTO conversations (workspace_id, whatsapp_phone_number_id, contact_id, status, last_message_preview, last_message_at, unread_count, window_expires_at)
        VALUES (${workspaceId}, ${phoneId}, ${c2[0].id}, 'open', 'Our pricing starts at ₹2,999/month for unlimited conversations.', NOW() - INTERVAL '5 minutes', 0, NOW() + INTERVAL '22 hours')
        ON CONFLICT (workspace_id, whatsapp_phone_number_id, contact_id) DO UPDATE SET last_message_preview = 'Our pricing starts at ₹2,999/month for unlimited conversations.'
        RETURNING id
      `;
      await sql`
        INSERT INTO messages (workspace_id, conversation_id, direction, sender_type, type, body, status, created_at)
        VALUES 
        (${workspaceId}, ${conv2[0].id}, 'inbound', 'customer', 'text', 'Can you tell me about the subscription plans?', 'delivered', NOW() - INTERVAL '6 minutes'),
        (${workspaceId}, ${conv2[0].id}, 'outbound', 'ai_agent', 'text', 'Our pricing starts at ₹2,999/month for unlimited conversations with full AI automation and multi-agent routing.', 'read', NOW() - INTERVAL '5 minutes')
        ON CONFLICT DO NOTHING
      `;
    } catch (seedErr) {
      console.warn('Demo conversation seed skipped:', seedErr);
    }
  }

  /**
   * Fetch paginated message history for a conversation
   */
  async getMessages(conversationId: string, workspaceId: string, limit: number = 100) {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT id, meta_message_id, direction, sender_type, type, body, caption, media_url, status, error_message, created_at
      FROM messages
      WHERE conversation_id = ${conversationId} AND workspace_id = ${workspaceId}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;
    return rows;
  }

  /**
   * Mark all unread messages in a conversation as read
   */
  async markConversationRead(conversationId: string, workspaceId: string) {
    await ensureCoreTables();
    return await sql`
      UPDATE conversations
      SET unread_count = 0
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId}
    `;
  }
}

export const messageService = new MessageService();
