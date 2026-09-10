import { sql } from '@/lib/db';

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  slug: string;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  slug?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'project';
}

export class ProjectService {
  /**
   * Generates a unique slug for a project within its parent workspace.
   */
  async generateUniqueSlug(workspaceId: string, name: string, preferredSlug?: string): Promise<string> {
    const baseSlug = slugify(preferredSlug || name);
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const { rows } = await sql`
        SELECT id FROM projects
        WHERE workspace_id = ${workspaceId} AND slug = ${candidate}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return candidate;
      }
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
    }
  }

  /**
   * Creates a new project scoped strictly to a specific workspace.
   */
  async createProject(workspaceId: string, input: CreateProjectInput): Promise<ProjectRecord> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required to create a project.');
    }
    if (!input.name || !input.name.trim()) {
      throw new Error('Project name is required.');
    }

    const trimmedName = input.name.trim();
    if (trimmedName.length > 255) {
      throw new Error('Project name must be 255 characters or fewer.');
    }

    const trimmedDesc = input.description?.trim() || null;
    const uniqueSlug = await this.generateUniqueSlug(workspaceId, trimmedName, input.slug);

    const { rows } = await sql`
      INSERT INTO projects (
        workspace_id,
        name,
        description,
        slug,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${workspaceId},
        ${trimmedName},
        ${trimmedDesc},
        ${uniqueSlug},
        'ACTIVE',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
    `;

    const r = rows[0];
    return {
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
  }

  /**
   * Lists projects scoped to the provided workspace with optional status filtering.
   * Default status filter is 'ACTIVE'.
   * Never returns projects from outside the workspace.
   */
  async getWorkspaceProjects(
    workspaceId: string,
    filter?: { status?: 'ACTIVE' | 'ARCHIVED' | 'ALL' | string },
  ): Promise<ProjectRecord[]> {
    if (!workspaceId) return [];

    const statusFilter = (filter?.status || 'ACTIVE').toUpperCase();

    let rows: any[];
    if (statusFilter === 'ALL') {
      const result = await sql`
        SELECT id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
        FROM projects
        WHERE workspace_id = ${workspaceId}
        ORDER BY created_at DESC
      `;
      rows = result.rows;
    } else if (statusFilter === 'ARCHIVED') {
      const result = await sql`
        SELECT id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
        FROM projects
        WHERE workspace_id = ${workspaceId}
          AND (UPPER(status) = 'ARCHIVED')
        ORDER BY created_at DESC
      `;
      rows = result.rows;
    } else {
      // Default: ACTIVE
      const result = await sql`
        SELECT id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
        FROM projects
        WHERE workspace_id = ${workspaceId}
          AND (UPPER(status) = 'ACTIVE' OR status IS NULL)
        ORDER BY created_at DESC
      `;
      rows = result.rows;
    }

    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      description: r.description,
      slug: r.slug || r.id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      archivedAt: r.archived_at,
    }));
  }

  /**
   * Fetches a project by its ID, ensuring it belongs to the specified workspace.
   * Returns null if not found or if the project belongs to a different workspace.
   */
  async getProjectById(workspaceId: string, projectId: string): Promise<ProjectRecord | null> {
    if (!workspaceId || !projectId) return null;

    const { rows } = await sql`
      SELECT id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
      FROM projects
      WHERE id = ${projectId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      description: r.description,
      slug: r.slug || r.id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      archivedAt: r.archived_at,
    };
  }

  /**
   * Fetches a project by its ID across any workspace (used for access resolution).
   */
  async getProjectByIdAnyWorkspace(projectId: string): Promise<ProjectRecord | null> {
    if (!projectId) return null;

    const { rows } = await sql`
      SELECT id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
      FROM projects
      WHERE id = ${projectId}
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      description: r.description,
      slug: r.slug || r.id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      archivedAt: r.archived_at,
    };
  }

  /**
   * Updates project details (name, description).
   * Strictly prevents altering workspace_id or tenant boundaries.
   */
  async updateProject(
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectRecord> {
    if (!workspaceId || !projectId) {
      throw new Error('Workspace ID and Project ID are required.');
    }

    const existing = await this.getProjectById(workspaceId, projectId);
    if (!existing) {
      throw new Error('Project not found in this workspace.');
    }

    const newName = input.name !== undefined ? input.name.trim() : existing.name;
    if (!newName) {
      throw new Error('Project name cannot be empty.');
    }
    if (newName.length > 255) {
      throw new Error('Project name must be 255 characters or fewer.');
    }

    const newDesc = input.description !== undefined ? input.description.trim() || null : existing.description;

    const { rows } = await sql`
      UPDATE projects
      SET name = ${newName},
          description = ${newDesc},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId} AND workspace_id = ${workspaceId}
      RETURNING id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
    `;

    const r = rows[0];
    return {
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
  }

  /**
   * Soft-archives a project by setting status = 'ARCHIVED' and setting archived_at.
   * Preserves project data.
   */
  async archiveProject(workspaceId: string, projectId: string): Promise<ProjectRecord> {
    if (!workspaceId || !projectId) {
      throw new Error('Workspace ID and Project ID are required.');
    }

    const { rows } = await sql`
      UPDATE projects
      SET status = 'ARCHIVED',
          archived_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId} AND workspace_id = ${workspaceId}
      RETURNING id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
    `;

    if (rows.length === 0) {
      throw new Error('Project not found in this workspace.');
    }

    const r = rows[0];
    return {
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
  }

  /**
   * Restores an archived project back to 'ACTIVE'.
   */
  async restoreProject(workspaceId: string, projectId: string): Promise<ProjectRecord> {
    if (!workspaceId || !projectId) {
      throw new Error('Workspace ID and Project ID are required.');
    }

    const { rows } = await sql`
      UPDATE projects
      SET status = 'ACTIVE',
          archived_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId} AND workspace_id = ${workspaceId}
      RETURNING id, workspace_id, name, description, slug, status, created_at, updated_at, archived_at
    `;

    if (rows.length === 0) {
      throw new Error('Project not found in this workspace.');
    }

    const r = rows[0];
    return {
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
  }

  /**
   * Ensures that a workspace has at least one active project.
   * If none exists, creates and returns a default project.
   */
  async ensureDefaultProject(workspaceId: string, projectName = 'Default Project'): Promise<ProjectRecord> {
    const existing = await this.getWorkspaceProjects(workspaceId, { status: 'ACTIVE' });
    if (existing.length > 0) {
      return existing[0];
    }
    return await this.createProject(workspaceId, {
      name: projectName,
      description: `Default project for workspace`,
      slug: 'default',
    });
  }
}

export const projectService = new ProjectService();
