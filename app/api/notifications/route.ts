import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Retrieves notifications for the active workspace
 */
export const GET = withAuth(async function getNotifications(_request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;

    const { rows: notifs } = await sql`
      SELECT 
        id,
        workspace_id as "workspaceId",
        user_id as "userId",
        title,
        message,
        category,
        link_url as "linkUrl",
        is_read as "isRead",
        created_at as "createdAt"
      FROM notifications
      WHERE workspace_id = ${workspaceId}
      ORDER BY created_at DESC
      LIMIT 25
    `;

    const unreadCount = (notifs || []).filter((n) => !n.isRead).length;

    return NextResponse.json({
      status: 'ok',
      data: {
        notifications: notifs || [],
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
});

/**
 * PATCH /api/notifications
 * Marks all notifications or a specific notification as read
 */
export const PATCH = withAuth(async function markNotificationsRead(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const body = await request.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE id = ${id} AND workspace_id = ${workspaceId}
      `;
    } else {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE workspace_id = ${workspaceId}
      `;
    }

    return NextResponse.json({ status: 'ok', message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
});
