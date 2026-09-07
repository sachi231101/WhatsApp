import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      companyName: user.companyName,
      workspaceId: user.workspaceId,
      tenantId: user.tenantId,
    },
  });
}
