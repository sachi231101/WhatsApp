import { NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { messageService } from '@/lib/services/messaging/messageService';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async function getConversations(request, session) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const workspaceId = session.workspace.workspaceId;

    const conversations = await messageService.getConversations(workspaceId, status);
    return NextResponse.json({ status: 'ok', data: conversations });
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
});
