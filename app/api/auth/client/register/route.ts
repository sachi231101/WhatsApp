import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSessionToken, applySessionCookie } from '@/lib/auth/session';
import { ensureCoreTables } from '@/lib/auth/context';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  try {
    await ensureCoreTables();
    const body = await request.json();
    const { companyName, name, email, password, phoneNumber } = body;

    if (!companyName?.trim() || !name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Company Name, Full Name, Email, and Password are all required.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = companyName.trim();
    const cleanName = name.trim();

    // Check if email already registered
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);
    const auth0Sub = `local|${cleanEmail}`;

    // 1. Insert user
    const { rows: userRows } = await sql`
      INSERT INTO users (
        auth0_sub, email, name, password_hash, role, company_name, phone_number, is_super_admin
      ) VALUES (
        ${auth0Sub}, ${cleanEmail}, ${cleanName}, ${passwordHash}, 'client', ${cleanCompany}, ${phoneNumber || null}, FALSE
      )
      RETURNING id, email, name, role, company_name
    `;
    const user = userRows[0];

    // 2. Provision dedicated Tenant for this business
    const cleanSlug = cleanCompany
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40) + '-' + user.id.slice(0, 6);

    const { rows: tenantRows } = await sql`
      INSERT INTO tenants (name, slug, plan, status)
      VALUES (${cleanCompany}, ${cleanSlug}, 'starter', 'active')
      RETURNING id, name
    `;
    const tenant = tenantRows[0];

    // 3. Provision Default Workspace
    const { rows: wsRows } = await sql`
      INSERT INTO workspaces (tenant_id, name, slug)
      VALUES (${tenant.id}, 'Primary Workspace', 'primary')
      RETURNING id, name
    `;
    const workspace = wsRows[0];

    // 4. Assign Owner membership (both membership tables used across codebase)
    await sql`
      INSERT INTO workspace_memberships (workspace_id, user_id, role, invitation_status)
      VALUES (${workspace.id}, ${user.id}, ${WORKSPACE_ROLES.OWNER}, 'active')
    `;
    try {
      await sql`
        INSERT INTO workspace_members (workspace_id, user_id, role, status, invitation_status)
        VALUES (${workspace.id}, ${user.id}, ${WORKSPACE_ROLES.OWNER}, 'active', 'active')
        ON CONFLICT (workspace_id, user_id) DO NOTHING
      `;
    } catch (memberErr) {
      console.warn('Notice: Could not mirror membership into workspace_members:', memberErr);
    }

    // 4b. Provision Default Project
    let defaultProjectId = '';
    try {
      const { rows: projRows } = await sql`
        INSERT INTO projects (workspace_id, name, description, slug, status)
        VALUES (${workspace.id}, 'Default Project', 'Initial default project', 'default', 'ACTIVE')
        RETURNING id
      `;
      if (projRows && projRows.length > 0) {
        defaultProjectId = projRows[0].id;
      }
    } catch (projErr) {
      console.warn('Notice: Could not provision default project during client registration:', projErr);
    }

    // 5. Generate session token & cookie
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'client',
      isSuperAdmin: false,
      tenantId: tenant.id,
      workspaceId: workspace.id,
      companyName: cleanCompany,
    });

    const response = NextResponse.json({
      success: true,
      redirectUrl: '/dashboard',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'client',
        companyName: cleanCompany,
      },
    });

    applySessionCookie(response, token);
    response.cookies.set('wazzapp_workspace_id', workspace.id, {
      path: '/',
      sameSite: 'lax',
    });
    if (defaultProjectId) {
      response.cookies.set('wazzapp_project_id', defaultProjectId, {
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Client registration error:', error);
    return NextResponse.json(
      { error: error?.message || 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }
}
