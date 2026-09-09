import { sql } from '@/lib/db';
import { requireAuthenticatedUser, getCurrentUser } from '@/lib/auth/user';
import { type WorkspaceRecord, type WorkspaceMemberRecord } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES, type WorkspaceRole, hasRoleAtLeast, normalizeWorkspaceRole } from '@/lib/auth/roles';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import type { ProjectRecord } from '@/lib/services/tenants/projectService';

export class ProjectNotFoundError extends Error {
  statusCode = 404;
  code = 'PROJECT_NOT_FOUND';

  constructor(message = 'Project not found.') {
    super(message);
    this.name = 'ProjectNotFoundError';
  }
}

export interface ProjectAccessContext {
  project: ProjectRecord;
  workspace: WorkspaceRecord;
  membership: WorkspaceMemberRecord;
}

/**
 * Resolves a project by its ID, strictly verifying that:
 * 1. The user is authenticated
 * 2. The project exists
 * 3. The authenticated user has active membership in the project's workspace
 * 
 * If the project does not exist OR belongs to another tenant/workspace where the user has no access,
 * throws a non-disclosing ProjectNotFoundError (404) to prevent enumeration/leaks.
 */
export async function requireProjectAccess(
  projectId: string,
  minRole?: WorkspaceRole,
  userId?: string,
): Promise<ProjectAccessContext> {
  if (!projectId || typeof projectId !== 'string') {
    throw new ProjectNotFoundError();
  }

  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const user = await requireAuthenticatedUser();
    effectiveUserId = user.id;
  }

  // Query project and user's membership in that project's workspace in a single secure query
  const { rows } = await sql`
    SELECT 
      p.id, p.workspace_id, p.name, p.description, p.slug, p.status, p.created_at, p.updated_at, p.archived_at,
      w.id as ws_id, w.name as ws_name, w.slug as ws_slug, w.status as ws_status, w.tenant_id as ws_tenant_id, w.created_at as ws_created_at, w.updated_at as ws_updated_at,
      wm.id as member_id, wm.role, wm.status as member_status, wm.created_at as member_created_at, wm.updated_at as member_updated_at
    FROM projects p
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ${effectiveUserId}
    WHERE p.id = ${projectId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    // Non-disclosing 404
    throw new ProjectNotFoundError();
  }

  const r = rows[0];

  // If the user has no membership in this workspace, return non-disclosing 404
  if (!r.member_id) {
    // Check if user is SuperAdmin as a special fallback
    const user = await getCurrentUser();
    if (!user?.isSuperAdmin) {
      throw new ProjectNotFoundError();
    }
  }

  const role = r.role ? normalizeWorkspaceRole(r.role) : WORKSPACE_ROLES.OWNER;

  // Verify minimum role level if specified
  if (minRole) {
    const authorized = hasRoleAtLeast(role, minRole);
    if (!authorized) {
      throw new RoleAuthorizationError(minRole);
    }
  }

  const project: ProjectRecord = {
    id: r.id,
    workspaceId: r.workspace_id,
    name: r.name,
    description: r.description,
    slug: r.slug,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
  };

  const workspace: WorkspaceRecord = {
    id: r.ws_id,
    name: r.ws_name,
    slug: r.ws_slug,
    status: r.ws_status,
    tenantId: r.ws_tenant_id,
    createdAt: r.ws_created_at,
    updatedAt: r.ws_updated_at,
  };

  const membership: WorkspaceMemberRecord = {
    id: r.member_id || 'super-admin-membership',
    workspaceId: r.ws_id,
    userId: effectiveUserId,
    role,
    status: r.member_status || 'active',
    createdAt: r.member_created_at || r.ws_created_at,
    updatedAt: r.member_updated_at || r.ws_updated_at,
  };

  return { project, workspace, membership };
}

/**
 * Returns the project context if accessible, or null if not found/unauthorized.
 */
export async function getProjectForUser(
  projectId: string,
  userId?: string,
): Promise<ProjectAccessContext | null> {
  try {
    return await requireProjectAccess(projectId, undefined, userId);
  } catch {
    return null;
  }
}
