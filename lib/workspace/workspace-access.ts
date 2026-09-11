import { sql } from '@/lib/db';
import { requireAuthenticatedUser, getCurrentUser } from '@/lib/auth/user';
import { WORKSPACE_ROLES, type WorkspaceRole, normalizeWorkspaceRole, hasRoleAtLeast } from '@/lib/auth/roles';

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  tenantId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkspaceAccessDeniedError extends Error {
  statusCode = 403;
  code = 'WORKSPACE_ACCESS_DENIED';

  constructor(message = 'You do not have access to this workspace.') {
    super(message);
    this.name = 'WorkspaceAccessDeniedError';
  }
}

export class RoleAuthorizationError extends Error {
  statusCode = 403;
  code = 'ROLE_REQUIRED';
  requiredRole: WorkspaceRole;

  constructor(requiredRole: WorkspaceRole, message?: string) {
    super(message || `Action requires role '${requiredRole}' or higher.`);
    this.name = 'RoleAuthorizationError';
    this.requiredRole = requiredRole;
  }
}

/**
 * Resolves the user's active workspace and membership.
 * Never trusts a client-supplied workspace ID without validating user membership.
 * If user has no workspaces, returns null (triggers onboarding).
 */
export async function getCurrentWorkspace(
  requestedWorkspaceId?: string,
): Promise<{ workspace: WorkspaceRecord; membership: WorkspaceMemberRecord } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  let targetWorkspaceId = requestedWorkspaceId;
  if (!targetWorkspaceId) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      targetWorkspaceId = cookieStore.get('wazzapp_workspace_id')?.value;
    } catch {
      // Ignored outside of request contexts
    }
  }

  // 1. If explicit workspace ID requested or cookie present, verify membership
  if (targetWorkspaceId) {
    const { rows } = await sql`
      SELECT 
        w.id, w.name, w.slug, w.status, w.tenant_id, w.created_at, w.updated_at,
        wm.id as member_id, wm.role, wm.status as member_status, wm.created_at as member_created_at, wm.updated_at as member_updated_at
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ${user.id}
        AND w.id = ${targetWorkspaceId}
        AND w.status = 'active'
        AND (wm.status = 'active' OR wm.invitation_status = 'active' OR wm.status IS NULL)
      LIMIT 1
    `;

    if (rows.length > 0) {
      const r = rows[0];
      const role = normalizeWorkspaceRole(r.role);
      return {
        workspace: {
          id: r.id,
          name: r.name,
          slug: r.slug,
          status: r.status,
          tenantId: r.tenant_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        },
        membership: {
          id: r.member_id,
          workspaceId: r.id,
          userId: user.id,
          role,
          status: r.member_status || 'active',
          createdAt: r.member_created_at,
          updatedAt: r.member_updated_at,
        },
      };
    }
    // If user is SuperAdmin, allow access
    if (user.isSuperAdmin) {
      const { rows: adminWs } = await sql`
        SELECT id, name, slug, status, tenant_id, created_at, updated_at
        FROM workspaces
        WHERE id = ${requestedWorkspaceId} AND status = 'active'
        LIMIT 1
      `;
      if (adminWs.length > 0) {
        const r = adminWs[0];
        return {
          workspace: {
            id: r.id,
            name: r.name,
            slug: r.slug,
            status: r.status,
            tenantId: r.tenant_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
          membership: {
            id: 'super-admin-membership',
            workspaceId: r.id,
            userId: user.id,
            role: WORKSPACE_ROLES.OWNER,
            status: 'active',
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
        };
      }
    }
  }

  // 2. Fetch primary/first active membership for user
  const { rows: defaultRows } = await sql`
    SELECT 
      w.id, w.name, w.slug, w.status, w.tenant_id, w.created_at, w.updated_at,
      wm.id as member_id, wm.role, wm.status as member_status, wm.created_at as member_created_at, wm.updated_at as member_updated_at
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ${user.id}
      AND w.status = 'active'
      AND (wm.status = 'active' OR wm.invitation_status = 'active' OR wm.status IS NULL)
    ORDER BY wm.created_at ASC
    LIMIT 1
  `;

  if (defaultRows.length === 0) {
    return null;
  }

  const def = defaultRows[0];
  const role = normalizeWorkspaceRole(def.role);
  return {
    workspace: {
      id: def.id,
      name: def.name,
      slug: def.slug,
      status: def.status,
      tenantId: def.tenant_id,
      createdAt: def.created_at,
      updatedAt: def.updated_at,
    },
    membership: {
      id: def.member_id,
      workspaceId: def.id,
      userId: user.id,
      role,
      status: def.member_status || 'active',
      createdAt: def.member_created_at,
      updatedAt: def.member_updated_at,
    },
  };
}

/**
 * Returns current user's membership in the active or requested workspace.
 */
export async function getCurrentMembership(
  workspaceId?: string,
): Promise<WorkspaceMemberRecord | null> {
  const current = await getCurrentWorkspace(workspaceId);
  return current?.membership || null;
}

/**
 * Strictly verifies that the authenticated user has active membership in the target workspace.
 * Prevents unauthorized access or cross-tenant tampering.
 * Throws WorkspaceAccessDeniedError (403) if access is denied.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  userId?: string,
): Promise<{ workspace: WorkspaceRecord; membership: WorkspaceMemberRecord }> {
  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new WorkspaceAccessDeniedError('Invalid or missing workspace ID.');
  }

  let effectiveUserId = userId;
  let isSuperAdmin = false;

  if (!effectiveUserId) {
    const user = await requireAuthenticatedUser();
    effectiveUserId = user.id;
    isSuperAdmin = Boolean(user.isSuperAdmin);
  }

  const membersResult = await sql`
    SELECT 
      w.id, w.name, w.slug, w.status, w.tenant_id, w.created_at, w.updated_at,
      wm.id as member_id, wm.role, wm.status as member_status, wm.created_at as member_created_at, wm.updated_at as member_updated_at
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ${effectiveUserId}
      AND w.id = ${workspaceId}
      AND w.status = 'active'
      AND (wm.status = 'active' OR wm.invitation_status = 'active' OR wm.status IS NULL)
    LIMIT 1
  `;
  let rows = membersResult.rows;

  if (rows.length === 0) {
    // Fallback: client register / auth context use workspace_memberships
    const { rows: membershipRows } = await sql`
      SELECT 
        w.id, w.name, w.slug, w.status, w.tenant_id, w.created_at, w.updated_at,
        wm.id as member_id, wm.role, wm.invitation_status as member_status,
        wm.created_at as member_created_at, wm.updated_at as member_updated_at
      FROM workspaces w
      JOIN workspace_memberships wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ${effectiveUserId}
        AND w.id = ${workspaceId}
        AND (w.status IS NULL OR w.status = 'active')
        AND (wm.invitation_status IS NULL OR wm.invitation_status = 'active')
      LIMIT 1
    `;
    if (membershipRows.length > 0) {
      rows = membershipRows;
      // Best-effort sync into workspace_members so future checks hit the primary table
      try {
        await sql`
          INSERT INTO workspace_members (workspace_id, user_id, role, status, invitation_status)
          VALUES (
            ${membershipRows[0].id},
            ${effectiveUserId},
            ${membershipRows[0].role || 'owner'},
            'active',
            'active'
          )
          ON CONFLICT (workspace_id, user_id) DO NOTHING
        `;
      } catch {
        // ignore sync failures
      }
    }
  }

  if (rows.length > 0) {
    const r = rows[0];
    const role = normalizeWorkspaceRole(r.role);
    return {
      workspace: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        tenantId: r.tenant_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
      membership: {
        id: r.member_id,
        workspaceId: r.id,
        userId: effectiveUserId,
        role,
        status: r.member_status || 'active',
        createdAt: r.member_created_at,
        updatedAt: r.member_updated_at,
      },
    };
  }

  if (isSuperAdmin) {
    const { rows: adminWs } = await sql`
      SELECT id, name, slug, status, tenant_id, created_at, updated_at
      FROM workspaces
      WHERE id = ${workspaceId} AND status = 'active'
      LIMIT 1
    `;
    if (adminWs.length > 0) {
      const r = adminWs[0];
      return {
        workspace: {
          id: r.id,
          name: r.name,
          slug: r.slug,
          status: r.status,
          tenantId: r.tenant_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        },
        membership: {
          id: 'super-admin-membership',
          workspaceId: r.id,
          userId: effectiveUserId,
          role: WORKSPACE_ROLES.OWNER,
          status: 'active',
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        },
      };
    }
  }

  throw new WorkspaceAccessDeniedError('You do not have access to this workspace.');
}

/**
 * Strictly verifies workspace membership AND required minimum role level.
 * Throws RoleAuthorizationError (403) if the user's role is insufficient.
 */
export async function requireWorkspaceRole(
  workspaceId: string,
  minRole: WorkspaceRole,
  userId?: string,
): Promise<{ workspace: WorkspaceRecord; membership: WorkspaceMemberRecord }> {
  const result = await requireWorkspaceMember(workspaceId, userId);
  const authorized = hasRoleAtLeast(result.membership.role, minRole);
  if (!authorized) {
    throw new RoleAuthorizationError(minRole);
  }
  return result;
}

export interface UserWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: WorkspaceRole;
  isOwner: boolean;
  memberStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Returns all active workspaces where the specified user has membership.
 * Never returns workspaces the user does not belong to.
 */
export async function getUserWorkspaces(userId?: string): Promise<UserWorkspaceItem[]> {
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const user = await getCurrentUser();
    if (!user) return [];
    effectiveUserId = user.id;
  }

  const { rows } = await sql`
    SELECT 
      w.id, w.name, w.slug, w.status, w.created_at, w.updated_at,
      wm.role, wm.status as member_status
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ${effectiveUserId}
      AND w.status = 'active'
      AND (wm.status = 'active' OR wm.invitation_status = 'active' OR wm.status IS NULL)
    ORDER BY wm.created_at ASC
  `;

  return rows.map((r: any) => {
    const role = normalizeWorkspaceRole(r.role);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      role,
      isOwner: role === WORKSPACE_ROLES.OWNER,
      memberStatus: r.member_status || 'active',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}
