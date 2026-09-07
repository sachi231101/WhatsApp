import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken, applySessionCookie } from '@/lib/auth/session';
import { resolveWorkspaceContext, ensureCoreTables } from '@/lib/auth/context';

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Admin Email and Password are required.' },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user
    const { rows } = await sql`
      SELECT id, email, name, role, is_super_admin, password_hash, company_name
      FROM users
      WHERE LOWER(email) = ${cleanEmail}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid admin email or password.' },
        { status: 401 },
      );
    }

    const user = rows[0];

    // Verify password
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid admin email or password.' },
        { status: 401 },
      );
    }

    // Role verification: MUST be admin or super admin
    const isAdmin = user.role === 'admin' || user.is_super_admin;
    if (!isAdmin) {
      return NextResponse.json(
        {
          error: 'Access Denied: This account is registered as a Client user and does not have Administrator privileges. Please use the Client Portal.',
          code: 'WRONG_PORTAL_CLIENT',
        },
        { status: 403 },
      );
    }

    // Resolve workspace context
    const ws = await resolveWorkspaceContext(user.email, user.name);

    // Create session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || 'System Admin',
      role: 'admin',
      isSuperAdmin: true,
      tenantId: ws.tenantId,
      workspaceId: ws.workspaceId,
      companyName: 'Platform Administration',
    });

    const response = NextResponse.json({
      success: true,
      redirectUrl: '/',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin',
        isSuperAdmin: true,
      },
    });

    applySessionCookie(response, token, 'admin');
    response.cookies.set('wazzapp_workspace_id', ws.workspaceId, {
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Admin authentication failed.' },
      { status: 500 },
    );
  }
}
