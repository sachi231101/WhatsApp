import { sql } from '@/lib/db';
import { WORKSPACE_ROLES, type WorkspaceRole } from '@/lib/auth/roles';

export interface WorkspaceRecord {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
  status: string;
  role?: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  tenantId: string;
  name: string;
  slug?: string;
  timezone?: string;
  defaultLocale?: string;
  createdByUserId: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  timezone?: string;
  defaultLocale?: string;
  status?: string;
}

export class WorkspaceService {
  /**
   * Creates a new workspace and automatically adds the creator as the Owner.
   */
  async createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceRecord> {
    const rawSlug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);
    const slug = rawSlug || 'workspace-' + Date.now().toString(36);
    const timezone = input.timezone || 'UTC';
    const defaultLocale = input.defaultLocale || 'en_US';

    const { rows } = await sql`
      INSERT INTO workspaces (tenant_id, name, slug, timezone, default_locale, status)
      VALUES (${input.tenantId}, ${input.name}, ${slug}, ${timezone}, ${defaultLocale}, 'active')
      RETURNING id, tenant_id, name, slug, timezone, default_locale, status, created_at, updated_at
    `;

    const workspace = rows[0];

    // Assign creator as owner
    await sql`
      INSERT INTO workspace_memberships (workspace_id, user_id, role, invitation_status)
      VALUES (${workspace.id}, ${input.createdByUserId}, ${WORKSPACE_ROLES.OWNER}, 'active')
      ON CONFLICT (workspace_id, user_id) 
      DO UPDATE SET role = ${WORKSPACE_ROLES.OWNER}, invitation_status = 'active'
    `;

    return {
      id: workspace.id,
      tenantId: workspace.tenant_id,
      name: workspace.name,
      slug: workspace.slug,
      timezone: workspace.timezone,
      defaultLocale: workspace.default_locale,
      status: workspace.status,
      role: WORKSPACE_ROLES.OWNER,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    };
  }

  /**
   * Retrieves a single workspace by its UUID, including tenant details.
   */
  async getWorkspaceById(workspaceId: string): Promise<WorkspaceRecord | null> {
    const { rows } = await sql`
      SELECT 
        w.id, w.tenant_id, w.name, w.slug, w.timezone, w.default_locale, w.status, w.created_at, w.updated_at,
        t.name as tenant_name
      FROM workspaces w
      JOIN tenants t ON w.tenant_id = t.id
      WHERE w.id = ${workspaceId}
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    const w = rows[0];
    return {
      id: w.id,
      tenantId: w.tenant_id,
      tenantName: w.tenant_name,
      name: w.name,
      slug: w.slug,
      timezone: w.timezone,
      defaultLocale: w.default_locale,
      status: w.status,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    };
  }

  /**
   * Returns all active workspaces where the given user is a member.
   */
  async getUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    const { rows } = await sql`
      SELECT 
        w.id, w.tenant_id, w.name, w.slug, w.timezone, w.default_locale, w.status, w.created_at, w.updated_at,
        wm.role,
        t.name as tenant_name
      FROM workspaces w
      JOIN workspace_memberships wm ON w.id = wm.workspace_id
      JOIN tenants t ON w.tenant_id = t.id
      WHERE wm.user_id = ${userId}
        AND (wm.invitation_status IS NULL OR wm.invitation_status = 'active')
        AND w.status = 'active'
      ORDER BY w.created_at ASC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      name: r.name,
      slug: r.slug,
      timezone: r.timezone,
      defaultLocale: r.default_locale,
      status: r.status,
      role: r.role as WorkspaceRole,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Updates workspace configuration.
   */
  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput): Promise<WorkspaceRecord | null> {
    const current = await this.getWorkspaceById(workspaceId);
    if (!current) return null;

    const name = input.name ?? current.name;
    const timezone = input.timezone ?? current.timezone;
    const defaultLocale = input.defaultLocale ?? current.defaultLocale;
    const status = input.status ?? current.status;

    const { rows } = await sql`
      UPDATE workspaces
      SET 
        name = ${name},
        timezone = ${timezone},
        default_locale = ${defaultLocale},
        status = ${status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${workspaceId}
      RETURNING id, tenant_id, name, slug, timezone, default_locale, status, created_at, updated_at
    `;

    const updated = rows[0];
    return {
      id: updated.id,
      tenantId: updated.tenant_id,
      tenantName: current.tenantName,
      name: updated.name,
      slug: updated.slug,
      timezone: updated.timezone,
      defaultLocale: updated.default_locale,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Deletes a workspace and its memberships (cascade).
   */
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    const { rowCount } = await sql`
      DELETE FROM workspaces WHERE id = ${workspaceId}
    `;
    return (rowCount ?? 0) > 0;
  }
}

export const workspaceService = new WorkspaceService();
