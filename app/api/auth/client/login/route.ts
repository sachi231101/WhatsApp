import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
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
        { error: 'Email and password are required.' },
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
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }

    const user = rows[0];

    // Verify password
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }

    // Role separation: If user is an Admin, block them with a clear helpful notice
    if (user.role === 'admin' || user.is_super_admin) {
      return NextResponse.json(
        {
          error: 'This portal is for Client accounts only. Please use the Admin Console to log in with an administrator account.',
          code: 'WRONG_PORTAL_ADMIN',
        },
        { status: 403 },
      );
    }

    // Resolve tenant & workspace
    const ws = await resolveWorkspaceContext(user.email, user.name);

    // Create session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || cleanEmail.split('@')[0],
      role: 'client',
      isSuperAdmin: false,
      tenantId: ws.tenantId,
      workspaceId: ws.workspaceId,
      companyName: user.company_name || 'My Business',
    });

    const response = NextResponse.json({
      success: true,
      redirectUrl: '/dashboard',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'client',
        companyName: user.company_name,
      },
    });

    applySessionCookie(response, token);
    response.cookies.set('wazzapp_workspace_id', ws.workspaceId, {
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Client login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Login failed. Please try again.' },
      { status: 500 },
    );
  }
}
