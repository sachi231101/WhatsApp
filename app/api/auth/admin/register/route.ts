import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth/password';
import { createSessionToken, applySessionCookie } from '@/lib/auth/session';
import { resolveWorkspaceContext, ensureCoreTables } from '@/lib/auth/context';

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const body = await request.json();
    const { name, email, password, adminKey } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password || !adminKey?.trim()) {
      return NextResponse.json(
        { error: 'Full Name, Admin Email, Password, and Master Admin Key are all required.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Admin password must be at least 6 characters long.' },
        { status: 400 },
      );
    }

    // Validate Admin Secret Key to prevent unauthorized registrations
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'admin-secret-2026';
    if (adminKey.trim() !== expectedKey) {
      return NextResponse.json(
        { error: 'Invalid Master Admin Key. Only authorized personnel may register an administrator account.' },
        { status: 403 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if user already exists
    const { rows: existing } = await sql`
      SELECT id, role, is_super_admin FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1
    `;

    let userId: string;

    if (existing.length > 0) {
      // User exists — promote to admin and update password
      const passwordHash = hashPassword(password);
      const { rows: updated } = await sql`
        UPDATE users
        SET role = 'admin',
            is_super_admin = TRUE,
            password_hash = ${passwordHash},
            name = ${cleanName}
        WHERE id = ${existing[0].id}
        RETURNING id
      `;
      userId = updated[0].id;
    } else {
      // Create new Admin user
      const passwordHash = hashPassword(password);
      const auth0Sub = `local|${cleanEmail}`;

      const { rows: userRows } = await sql`
        INSERT INTO users (
          auth0_sub, email, name, password_hash, role, is_super_admin, status
        ) VALUES (
          ${auth0Sub}, ${cleanEmail}, ${cleanName}, ${passwordHash}, 'admin', TRUE, 'active'
        )
        RETURNING id
      `;
      userId = userRows[0].id;
    }

    // Resolve workspace context
    const ws = await resolveWorkspaceContext(cleanEmail, cleanName);

    // Generate session token
    const token = createSessionToken({
      userId,
      email: cleanEmail,
      name: cleanName,
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
        id: userId,
        email: cleanEmail,
        name: cleanName,
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
    console.error('Admin registration error:', error);
    return NextResponse.json(
      { error: error?.message || 'Admin registration failed.' },
      { status: 500 },
    );
  }
}
