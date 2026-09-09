import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { enqueueOutboundMessage } from '@/lib/queue/outboundQueue';
import { publishInboxEvent } from '@/lib/realtime/ablyPublisher';

export interface GetConversationsOptions {
  workspaceId: string;
  projectId: string;
  filter?: 'all' | 'unread' | 'mine' | 'unassigned' | 'ai' | 'human' | 'resolved';
  userId?: string;
  search?: string;
  cursor?: string; // ISO date or timestamp
  limit?: number;
}

export interface SendOutboundMessageInput {
  workspaceId: string;
  projectId: string;
  conversationId: string;
  userId: string;
  content: string;
  type?: string;
  idempotencyKey?: string;
  replyToMessageId?: string;
}

export class InboxService {
  /**
   * List conversations strictly scoped by workspace_id and project_id.
   * Supports server-side filters, search, and cursor-based pagination.
   */
  async getConversations(options: GetConversationsOptions) {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      filter = 'all',
      userId,
      search,
      cursor,
      limit = 25,
    } = options;

    const pageSize = Math.min(Math.max(1, limit), 50);
    const searchParam = search && search.trim() ? `%${search.trim().toLowerCase()}%` : null;
    const cursorParam = cursor && !isNaN(new Date(cursor).getTime()) ? new Date(cursor).toISOString() : null;
    const targetUserId = userId || null;

    const { rows } = await sql`
      SELECT 
        c.id, c.workspace_id, c.project_id, c.contact_id, c.status,
        c.handling_mode, c.priority, c.assigned_user_id, c.last_message_at,
        c.last_message_preview, c.unread_count, c.window_expires_at,
        c.resolved_at, c.escalation_reason, c.created_at, c.updated_at,
        ct.wa_id, ct.phone_number, ct.profile_name, ct.avatar_url,
        ct.lead_score, ct.custom_attributes,
        u.name as assigned_user_name, u.email as assigned_user_email
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN users u ON c.assigned_user_id = u.id
      WHERE 
        c.workspace_id = ${workspaceId} AND 
        c.project_id = ${projectId} AND
        (
          (${filter} = 'unread' AND c.unread_count > 0 AND c.status != 'resolved' AND c.status != 'closed') OR
          (${filter} = 'mine' AND c.assigned_user_id = ${targetUserId} AND c.status != 'resolved' AND c.status != 'closed') OR
          (${filter} = 'unassigned' AND c.assigned_user_id IS NULL AND c.status != 'resolved' AND c.status != 'closed') OR
          (${filter} = 'ai' AND c.handling_mode = 'AI_HANDLING' AND c.status != 'resolved' AND c.status != 'closed') OR
          (${filter} = 'human' AND c.handling_mode = 'HUMAN_HANDLING' AND c.status != 'resolved' AND c.status != 'closed') OR
          (${filter} = 'resolved' AND (c.status = 'resolved' OR c.status = 'closed')) OR
          (${filter} = 'all' AND c.status != 'resolved' AND c.status != 'closed')
        ) AND
        (
          ${searchParam}::text IS NULL OR
          LOWER(ct.profile_name) LIKE ${searchParam} OR
          ct.phone_number LIKE ${searchParam} OR
          LOWER(COALESCE(c.last_message_preview, '')) LIKE ${searchParam}
        ) AND
        (
          ${cursorParam}::text IS NULL OR
          c.last_message_at < ${cursorParam}::timestamptz
        )
      ORDER BY c.last_message_at DESC, c.id DESC
      LIMIT ${pageSize + 1}
    `;

    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const nextCursor = items.length > 0 ? items[items.length - 1].last_message_at : null;

    return {
      conversations: items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get single conversation details with customer context.
   */
  async getConversationDetails(workspaceId: string, projectId: string, conversationId: string) {
    await ensureCoreTables();

    const { rows } = await sql`
      SELECT 
        c.id, c.workspace_id, c.project_id, c.contact_id, c.status,
        c.handling_mode, c.priority, c.assigned_user_id, c.last_message_at,
        c.last_message_preview, c.unread_count, c.window_expires_at,
        c.resolved_at, c.escalation_reason, c.metadata, c.created_at, c.updated_at,
        ct.wa_id, ct.phone_number, ct.profile_name, ct.avatar_url,
        ct.lead_score, ct.custom_attributes, ct.lifecycle_stage,
        u.name as assigned_user_name, u.email as assigned_user_email
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN users u ON c.assigned_user_id = u.id
      WHERE c.id = ${conversationId} AND c.workspace_id = ${workspaceId} AND c.project_id = ${projectId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get messages for a conversation (cursor pagination, older messages loaded by cursor).
   * Also integrates internal team notes into the timeline.
   */
  async getMessages(
    workspaceId: string,
    projectId: string,
    conversationId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    await ensureCoreTables();

    // Verify conversation access
    const { rows: convCheck } = await sql`
      SELECT id, window_expires_at FROM conversations
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (convCheck.length === 0) {
      return null;
    }

    const pageSize = Math.min(Math.max(1, limit), 100);

    const cursorParam = cursor && !isNaN(new Date(cursor).getTime()) ? new Date(cursor).toISOString() : null;

    // Fetch messages
    const { rows: messageRows } = await sql`
      SELECT 
        m.id, m.workspace_id, m.project_id, m.conversation_id,
        m.meta_message_id, m.external_message_id, m.direction,
        m.sender_type, m.sender_id, m.type, m.body, m.caption,
        m.media_url, m.media_metadata, m.status, m.error_message,
        m.reply_to_message_id, m.is_internal, m.created_at,
        u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE 
        m.conversation_id = ${conversationId} AND 
        m.workspace_id = ${workspaceId} AND 
        m.project_id = ${projectId} AND
        (${cursorParam}::text IS NULL OR m.created_at < ${cursorParam}::timestamptz)
      ORDER BY m.created_at DESC
      LIMIT ${pageSize + 1}
    `;

    // Fetch internal notes
    const { rows: noteRows } = await sql`
      SELECT 
        n.id, n.workspace_id, n.project_id, n.conversation_id,
        'internal_note' as type, n.content as body, 'system' as sender_type,
        'inbound' as direction, 'delivered' as status, true as is_internal,
        n.created_at, u.name as sender_name, u.email as sender_email
      FROM internal_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE 
        n.conversation_id = ${conversationId} AND
        n.workspace_id = ${workspaceId} AND
        n.project_id = ${projectId}
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    const hasMore = messageRows.length > pageSize;
    const rawItems = hasMore ? messageRows.slice(0, pageSize) : messageRows;

    // Merge notes and messages, sorted chronologically ascending for the timeline
    const combined = [...rawItems, ...noteRows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const nextCursor = rawItems.length > 0 ? rawItems[rawItems.length - 1].created_at : null;

    return {
      messages: combined,
      windowExpiresAt: convCheck[0].window_expires_at,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Reset unread message count for a conversation.
   */
  async markConversationRead(workspaceId: string, projectId: string, conversationId: string) {
    await ensureCoreTables();

    await sql`
      UPDATE conversations
      SET unread_count = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
    `;

    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'conversation.updated',
      data: { conversationId, unreadCount: 0 },
    });
  }

  /**
   * Send an outbound customer message with QUEUED status, BullMQ queueing, and idempotency.
   */
  async sendOutboundMessage(input: SendOutboundMessageInput) {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      conversationId,
      userId,
      content,
      type = 'text',
      idempotencyKey,
      replyToMessageId,
    } = input;

    if (!content || !content.trim()) {
      throw new Error('Message content is required');
    }

    // 1. Fetch conversation and contact
    const { rows: convRows } = await sql`
      SELECT 
        c.id, c.workspace_id, c.project_id, c.window_expires_at,
        ct.phone_number, ct.wa_id
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.id = ${conversationId} AND c.workspace_id = ${workspaceId} AND c.project_id = ${projectId}
      LIMIT 1
    `;

    if (convRows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    const conv = convRows[0];

    // 2. WhatsApp 24-Hour Policy Window Enforcement
    if (type !== 'template' && conv.window_expires_at) {
      const windowExpiry = new Date(conv.window_expires_at).getTime();
      if (Date.now() > windowExpiry) {
        return {
          error: 'Free-form messages unavailable. Customer service window expired. Use a WhatsApp template to continue.',
          windowExpired: true,
        };
      }
    }

    // 3. Outbound Idempotency Check
    if (idempotencyKey) {
      const { rows: existingMsgRows } = await sql`
        SELECT id, conversation_id, body, status, created_at, meta_message_id
        FROM messages
        WHERE workspace_id = ${workspaceId} AND project_id = ${projectId} AND idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      if (existingMsgRows.length > 0) {
        return {
          message: existingMsgRows[0],
          deduplicated: true,
        };
      }
    }

    // 4. Resolve reply-to Meta message ID if specified
    let replyToMetaId: string | undefined;
    if (replyToMessageId) {
      const { rows: replyRows } = await sql`
        SELECT meta_message_id FROM messages WHERE id = ${replyToMessageId} LIMIT 1
      `;
      replyToMetaId = replyRows[0]?.meta_message_id || undefined;
    }

    // 5. Create Message with QUEUED status
    const { rows: msgRows } = await sql`
      INSERT INTO messages (
        workspace_id, project_id, conversation_id, direction, sender_type,
        sender_id, type, body, status, idempotency_key, reply_to_message_id, created_at
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${conversationId}, 'outbound', 'user',
        ${userId}, ${type}, ${content.trim()}, 'queued', ${idempotencyKey || null},
        ${replyToMessageId || null}, CURRENT_TIMESTAMP
      )
      RETURNING id, conversation_id, body, type, status, created_at
    `;

    const message = msgRows[0];

    // 6. Update conversation preview
    await sql`
      UPDATE conversations
      SET 
        last_message_preview = ${content.trim().slice(0, 100)},
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // 7. Enqueue BullMQ Outbound Job
    const jobId = await enqueueOutboundMessage({
      messageId: message.id,
      workspaceId,
      projectId,
      conversationId,
      destPhone: conv.phone_number || conv.wa_id,
      body: content.trim(),
      type,
      idempotencyKey,
      replyToMetaId,
    });

    // 8. Publish Optimistic/Queued Event to Ably
    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'message.created',
      data: {
        conversationId,
        message: {
          ...message,
          sender_name: 'You',
        },
      },
    });

    return {
      message,
      jobId,
      deduplicated: false,
    };
  }

  /**
   * Assign a conversation to a team member in the authorized workspace.
   */
  async assignConversation(params: {
    workspaceId: string;
    projectId: string;
    conversationId: string;
    targetUserId: string | null;
    assignedByUserId: string;
  }) {
    await ensureCoreTables();
    const { workspaceId, projectId, conversationId, targetUserId, assignedByUserId } = params;

    // Verify conversation access
    const { rows: convCheck } = await sql`
      SELECT id FROM conversations
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (convCheck.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    let targetUserName: string | null = null;
    if (targetUserId) {
      // Verify target user belongs to the SAME workspace
      const { rows: memberRows } = await sql`
        SELECT wm.user_id, u.name
        FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${targetUserId} AND wm.status = 'active'
        LIMIT 1
      `;
      if (memberRows.length === 0) {
        throw new Error('Target user does not belong to this workspace');
      }
      targetUserName = memberRows[0].name;
    }

    // Update assignment
    await sql`
      UPDATE conversations
      SET 
        assigned_user_id = ${targetUserId || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // Record assignment log
    await sql`
      INSERT INTO conversation_assignments (
        workspace_id, conversation_id, assignee_type, assignee_id, assigned_by_user_id, created_at
      )
      VALUES (
        ${workspaceId}, ${conversationId}, 'user', ${targetUserId || '00000000-0000-0000-0000-000000000000'},
        ${assignedByUserId}, CURRENT_TIMESTAMP
      )
    `;

    // Broadcast to Ably
    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'conversation.assigned',
      data: {
        conversationId,
        assignedUserId: targetUserId,
        assignedUserName: targetUserName,
      },
    });

    return { success: true, assignedUserId: targetUserId, assignedUserName: targetUserName };
  }

  /**
   * Update AI vs Human handling mode (Takeover / Return to AI).
   */
  async updateHandlingMode(params: {
    workspaceId: string;
    projectId: string;
    conversationId: string;
    handlingMode: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
    userId: string;
    reason?: string;
  }) {
    await ensureCoreTables();
    const { workspaceId, projectId, conversationId, handlingMode, userId, reason } = params;

    const { rows: convRows } = await sql`
      SELECT id, assigned_user_id FROM conversations
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (convRows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    let assignedUser = convRows[0].assigned_user_id;
    // Human takeover auto-assigns to the user taking over if currently unassigned
    if (handlingMode === 'HUMAN_HANDLING' && !assignedUser) {
      assignedUser = userId;
    }

    await sql`
      UPDATE conversations
      SET 
        handling_mode = ${handlingMode},
        assigned_user_id = ${assignedUser},
        escalation_reason = ${reason || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'conversation.updated',
      data: {
        conversationId,
        handlingMode,
        assignedUserId: assignedUser,
      },
    });

    return { success: true, handlingMode, assignedUserId: assignedUser };
  }

  /**
   * Update conversation lifecycle status (resolve or reopen).
   */
  async updateConversationStatus(params: {
    workspaceId: string;
    projectId: string;
    conversationId: string;
    status: 'open' | 'pending' | 'resolved' | 'closed';
  }) {
    await ensureCoreTables();
    const { workspaceId, projectId, conversationId, status } = params;

    const { rows: convRows } = await sql`
      SELECT id FROM conversations
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (convRows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    const isResolved = status === 'resolved' || status === 'closed';

    await sql`
      UPDATE conversations
      SET 
        status = ${status},
        resolved_at = ${isResolved ? new Date().toISOString() : null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    await publishInboxEvent({
      workspaceId,
      projectId,
      event: isResolved ? 'conversation.resolved' : 'conversation.updated',
      data: {
        conversationId,
        status,
        resolvedAt: isResolved ? new Date().toISOString() : null,
      },
    });

    return { success: true, status };
  }

  /**
   * Add team internal note (never dispatched to Meta).
   */
  async addInternalNote(params: {
    workspaceId: string;
    projectId: string;
    conversationId: string;
    userId: string;
    content: string;
  }) {
    await ensureCoreTables();
    const { workspaceId, projectId, conversationId, userId, content } = params;

    if (!content || !content.trim()) {
      throw new Error('Note content is required');
    }

    // Verify conversation access
    const { rows: convCheck } = await sql`
      SELECT id FROM conversations
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (convCheck.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    // Insert into internal_notes
    const { rows: noteRows } = await sql`
      INSERT INTO internal_notes (
        workspace_id, project_id, conversation_id, user_id, content, created_at, updated_at
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${conversationId}, ${userId}, ${content.trim()},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id, content, created_at
    `;

    const note = noteRows[0];

    // Get user name for broadcast
    const { rows: userRows } = await sql`SELECT name FROM users WHERE id = ${userId} LIMIT 1`;
    const senderName = userRows[0]?.name || 'Team Member';

    // Broadcast to Ably
    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'note.created',
      data: {
        conversationId,
        note: {
          id: note.id,
          body: note.content,
          is_internal: true,
          type: 'internal_note',
          sender_name: senderName,
          created_at: note.created_at,
        },
      },
    });

    return { success: true, note };
  }

  /**
   * Retry a failed outbound message.
   */
  async retryFailedMessage(params: {
    workspaceId: string;
    projectId: string;
    conversationId: string;
    messageId: string;
  }) {
    await ensureCoreTables();
    const { workspaceId, projectId, conversationId, messageId } = params;

    const { rows: msgRows } = await sql`
      SELECT 
        m.id, m.body, m.type, ct.phone_number, ct.wa_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE 
        m.id = ${messageId} AND
        m.conversation_id = ${conversationId} AND
        m.workspace_id = ${workspaceId} AND
        m.project_id = ${projectId} AND
        m.status = 'failed'
      LIMIT 1
    `;

    if (msgRows.length === 0) {
      throw new Error('Failed message not found or cannot be retried');
    }

    const msg = msgRows[0];

    // Reset status to queued
    await sql`
      UPDATE messages
      SET status = 'queued', error_message = NULL
      WHERE id = ${messageId}
    `;

    // Re-enqueue
    const jobId = await enqueueOutboundMessage({
      messageId,
      workspaceId,
      projectId,
      conversationId,
      destPhone: msg.phone_number || msg.wa_id,
      body: msg.body,
      type: msg.type,
    });

    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'message.status.updated',
      data: {
        messageId,
        conversationId,
        status: 'queued',
      },
    });

    return { success: true, messageId, jobId };
  }
}

export const inboxService = new InboxService();
