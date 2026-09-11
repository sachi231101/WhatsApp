import { NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async function getDashboardStats(_request, session) {
  try {
    const workspaceId = session.workspace.workspaceId;

    // 1. Conversations
    const { rows: convStats } = await sql`
      SELECT 
        COUNT(*)::int as total_conversations,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int as resolved_conversations,
        COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open_conversations
      FROM conversations
      WHERE workspace_id = ${workspaceId}
    `;

    // 2. Messages
    const { rows: msgStats } = await sql`
      SELECT 
        COUNT(*)::int as total_messages,
        COUNT(CASE WHEN sender_type = 'ai_agent' THEN 1 END)::int as ai_messages,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END)::int as messages_today
      FROM messages
      WHERE workspace_id = ${workspaceId}
    `;

    // 3. Contacts
    const { rows: contactStats } = await sql`
      SELECT 
        COUNT(*)::int as total_contacts,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int as new_contacts_7d,
        COUNT(CASE WHEN custom_attributes->>'stage' = 'hot_lead' OR (custom_attributes->>'score')::int >= 75 THEN 1 END)::int as hot_leads
      FROM contacts
      WHERE workspace_id = ${workspaceId}
    `;

    // 4. Recent Conversations (no demo seeding)
    const { rows: recentConversations } = await sql`
      SELECT 
        c.id, c.status, c.last_message_preview, c.last_message_at, c.unread_count,
        ct.wa_id, ct.phone_number, ct.profile_name, ct.custom_attributes
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.workspace_id = ${workspaceId}
      ORDER BY c.last_message_at DESC
      LIMIT 5
    `;

    const total = convStats[0]?.total_conversations || 0;
    const resolved = convStats[0]?.resolved_conversations || 0;
    const aiMessages = msgStats[0]?.ai_messages || 0;
    const totalMessages = msgStats[0]?.total_messages || 0;
    const rate =
      total > 0
        ? Number(((resolved / total) * 100).toFixed(1))
        : totalMessages > 0
          ? Number(((aiMessages / totalMessages) * 100).toFixed(1))
          : 0;

    // 5. Unified WhatsApp connection (exclude demo seed phones)
    let isWhatsAppConnected = false;
    try {
      const { rows: phoneRows } = await sql`
        SELECT COUNT(*)::int as phone_count
        FROM whatsapp_phone_numbers
        WHERE workspace_id = ${workspaceId}
          AND status != 'deleted'
          AND phone_number_id NOT LIKE 'demo_%'
      `;
      const { rows: connRows } = await sql`
        SELECT COUNT(*)::int as conn_count
        FROM whatsapp_connections
        WHERE workspace_id = ${workspaceId}
          AND status = 'CONNECTED'
      `;
      isWhatsAppConnected =
        (phoneRows[0]?.phone_count || 0) > 0 || (connRows[0]?.conn_count || 0) > 0;
    } catch {
      isWhatsAppConnected = false;
    }

    // 6. Setup progress (AI agents + knowledge bases)
    let hasAiAgent = false;
    let hasKnowledgeBase = false;
    try {
      const { rows: agentRows } = await sql`
        SELECT COUNT(*)::int as agent_count
        FROM ai_agents
        WHERE workspace_id = ${workspaceId}
          AND (status IS NULL OR status != 'ARCHIVED')
          AND archived_at IS NULL
      `;
      hasAiAgent = (agentRows[0]?.agent_count || 0) > 0;
    } catch {
      hasAiAgent = false;
    }

    try {
      const { rows: kbRows } = await sql`
        SELECT COUNT(*)::int as kb_count
        FROM knowledge_bases
        WHERE workspace_id = ${workspaceId}
          AND (status IS NULL OR status != 'ARCHIVED')
          AND archived_at IS NULL
      `;
      hasKnowledgeBase = (kbRows[0]?.kb_count || 0) > 0;
    } catch {
      hasKnowledgeBase = false;
    }

    const workspaceCreated = true;
    const flags = {
      workspaceCreated,
      whatsappConnected: isWhatsAppConnected,
      hasAiAgent,
      hasKnowledgeBase,
    };
    const completedCount = [
      flags.workspaceCreated,
      flags.whatsappConnected,
      flags.hasAiAgent,
      flags.hasKnowledgeBase,
    ].filter(Boolean).length;

    return NextResponse.json({
      status: 'ok',
      data: {
        isWhatsAppConnected,
        setupProgress: {
          ...flags,
          completedCount,
          total: 4,
        },
        stats: {
          totalConversations: total,
          openConversations: convStats[0]?.open_conversations || 0,
          aiResolved: resolved,
          hotLeads: contactStats[0]?.hot_leads || 0,
          conversionRate: `${rate}%`,
          aiResolutionRate: rate,
          messagesToday: msgStats[0]?.messages_today || 0,
          totalMessages,
          activeContacts: contactStats[0]?.total_contacts || 0,
          newContacts: contactStats[0]?.new_contacts_7d || 0,
        },
        recentConversations,
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
});
