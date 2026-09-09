import { sql } from '@/lib/db';
import { WORKSPACE_ROLES, type WorkspaceRole, normalizeWorkspaceRole } from '@/lib/auth/roles';

export interface WorkspaceRecord {
  id: string;
  tenantId?: string | null;
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
  tenantId?: string;
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
   * Generates a unique, URL-safe slug for the workspace.
   */
  async generateUniqueSlug(baseNameOrSlug: string): Promise<string> {
    const raw = baseNameOrSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 45);

    const baseSlug = raw || 'workspace';

    // Check if baseSlug already exists
    const { rows } = await sql`
      SELECT id FROM workspaces WHERE slug = ${baseSlug} LIMIT 1
    `;

    if (rows.length === 0) {
      return baseSlug;
    }

    // Append random hex or timestamp until unique
    for (let i = 0; i < 5; i++) {
      const candidate = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { rows: check } = await sql`
        SELECT id FROM workspaces WHERE slug = ${candidate} LIMIT 1
      `;
      if (check.length === 0) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  /**
   * Creates a new workspace and assigns the creator as OWNER in a single database transaction.
   * Conceptually:
   * BEGIN
   *   create workspace
   *   create workspace_members with role OWNER
   * COMMIT
   * If anything fails: ROLLBACK
   * Never leaves a workspace without its OWNER membership.
   */
  async createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceRecord> {
    if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
      throw new Error('Workspace name is required.');
    }
    if (!input.createdByUserId) {
      throw new Error('Creator user ID is required.');
    }

    const cleanName = input.name.trim();
    const slug = await this.generateUniqueSlug(input.slug || cleanName);
    const timezone = input.timezone?.trim() || 'UTC';
    const defaultLocale = input.defaultLocale?.trim() || 'en_US';

    // Ensure we have a valid tenant_id for foreign keys if required
    let tenantId = input.tenantId;
    if (!tenantId) {
      // Check if user has an existing tenant or create one
      const { rows: userTenant } = await sql`
        SELECT t.id FROM tenants t
        JOIN workspaces w ON w.tenant_id = t.id
        JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE wm.user_id = ${input.createdByUserId}
        LIMIT 1
      `;

      if (userTenant.length > 0) {
        tenantId = userTenant[0].id;
      } else {
        const tenantSlug = `tenant-${slug}`;
        const { rows: newTenant } = await sql`
          INSERT INTO tenants (name, slug)
          VALUES (${cleanName + ' Organization'}, ${tenantSlug})
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        tenantId = newTenant[0]?.id;
      }
    }

    // Begin transaction
    try {
      await sql`BEGIN`;

      // 1. Create workspace
      const { rows: wsRows } = await sql`
        INSERT INTO workspaces (tenant_id, name, slug, timezone, default_locale, status)
        VALUES (${tenantId || null}, ${cleanName}, ${slug}, ${timezone}, ${defaultLocale}, 'active')
        RETURNING id, tenant_id, name, slug, timezone, default_locale, status, created_at, updated_at
      `;

      if (!wsRows || wsRows.length === 0) {
        throw new Error('Failed to insert workspace record.');
      }

      const workspace = wsRows[0];

      // 2. Create workspace member with OWNER role
      await sql`
        INSERT INTO workspace_members (workspace_id, user_id, role, status, invitation_status)
        VALUES (${workspace.id}, ${input.createdByUserId}, ${WORKSPACE_ROLES.OWNER}, 'active', 'active')
        ON CONFLICT (workspace_id, user_id) 
        DO UPDATE SET role = ${WORKSPACE_ROLES.OWNER}, status = 'active'
      `;

      // Also ensure workspace_memberships mirror if table exists separately
      try {
        await sql`
          INSERT INTO workspace_memberships (workspace_id, user_id, role, invitation_status)
          VALUES (${workspace.id}, ${input.createdByUserId}, ${WORKSPACE_ROLES.OWNER}, 'active')
          ON CONFLICT (workspace_id, user_id) DO NOTHING
        `;
      } catch {
        // Ignored if workspace_memberships is aliased or does not exist
      }

      await sql`COMMIT`;

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
    } catch (error) {
      await sql`ROLLBACK`;
      console.error('Transactional workspace creation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single workspace by its UUID.
   */
  async getWorkspaceById(workspaceId: string): Promise<WorkspaceRecord | null> {
    const { rows } = await sql`
      SELECT 
        w.id, w.tenant_id, w.name, w.slug, w.timezone, w.default_locale, w.status, w.created_at, w.updated_at,
        t.name as tenant_name
      FROM workspaces w
      LEFT JOIN tenants t ON w.tenant_id = t.id
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
   * Returns all active workspaces where the given user is an active member.
   */
  async getUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    const { rows } = await sql`
      SELECT 
        w.id, w.tenant_id, w.name, w.slug, w.timezone, w.default_locale, w.status, w.created_at, w.updated_at,
        wm.role,
        t.name as tenant_name
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN tenants t ON w.tenant_id = t.id
      WHERE wm.user_id = ${userId}
        AND (wm.status = 'active' OR wm.invitation_status = 'active' OR wm.status IS NULL)
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
      role: normalizeWorkspaceRole(r.role),
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
