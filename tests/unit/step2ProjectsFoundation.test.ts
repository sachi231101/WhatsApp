import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted SQL Mock
const { mockSql, sqlMockObj } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] as any[] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });
  return { mockSql: mockFn, sqlMockObj: obj };
});

vi.mock('@vercel/postgres', () => ({
  sql: sqlMockObj,
}));

vi.mock('@/lib/db', () => ({
  sql: sqlMockObj,
}));

// Mock Auth0 client
const mockAuth0Session = vi.fn();
vi.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: () => mockAuth0Session(),
  },
}));

import {
  requireWorkspaceMember,
  requireWorkspaceRole,
  getUserWorkspaces,
  WorkspaceAccessDeniedError,
  RoleAuthorizationError,
} from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { projectService } from '@/lib/services/tenants/projectService';
import {
  requireProjectAccess,
  ProjectNotFoundError,
} from '@/lib/projects/project-access';

describe('STEP 2: Workspace & Projects Foundation', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const workspaceBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const projectAId = 'project-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectBId = 'project-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth0Session.mockReset();
    mockSql.mockImplementation(async (): Promise<{ rows: any[] }> => ({ rows: [] }));
  });

  // 1. User can list projects in their workspace
  it('1. User can list projects in their workspace', async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const wsId = values[0];
      if (wsId === workspaceAId) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Admissions',
              description: 'Handle student admissions',
              slug: 'admissions',
              status: 'ACTIVE',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
              archived_at: null as Date | null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const projects = await projectService.getWorkspaceProjects(workspaceAId);
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(projectAId);
    expect(projects[0].workspaceId).toBe(workspaceAId);
    expect(projects[0].name).toBe('Admissions');
    expect(projects[0].status).toBe('ACTIVE');
  });

  // 2. User cannot list projects from another workspace
  it('2. User cannot list projects from another workspace when unauthorized', async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const userId = values[0];
      const targetWs = values[1];
      if (userId === userAId && targetWs === workspaceAId) {
        return {
          rows: [{ id: targetWs, name: 'Workspace A', status: 'active', role: 'OWNER' }],
        };
      }
      return { rows: [] };
    });

    // Attempting to authorize User A in Workspace B throws 403
    await expect(requireWorkspaceMember(workspaceBId, userAId)).rejects.toThrow(
      WorkspaceAccessDeniedError,
    );
  });

  // 3. User can open own project
  it('3. User can open own project', async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const [userId, projectId] = values;
      if (userId === userAId && projectId === projectAId) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Admissions',
              description: 'Admissions project',
              slug: 'admissions',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
              archived_at: null as Date | null,
              ws_id: workspaceAId,
              ws_name: 'Wazzi Education',
              ws_slug: 'wazzi-education',
              ws_status: 'active',
              ws_tenant_id: null as string | null,
              ws_created_at: new Date(),
              ws_updated_at: new Date(),
              member_id: 'member-1',
              role: 'OWNER',
              member_status: 'active',
              member_created_at: new Date(),
              member_updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const context = await requireProjectAccess(projectAId, undefined, userAId);
    expect(context.project.id).toBe(projectAId);
    expect(context.project.name).toBe('Admissions');
    expect(context.workspace.id).toBe(workspaceAId);
    expect(context.membership.role).toBe(WORKSPACE_ROLES.OWNER);
  });

  // 4. User cannot open another workspace's project
  it("4. User cannot open another workspace's project (throws non-disclosing ProjectNotFoundError)", async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const [_userId, projectId] = values;
      // Project B exists, but belongs to Workspace B where User A is NOT a member
      if (projectId === projectBId) {
        return {
          rows: [
            {
              id: projectBId,
              workspace_id: workspaceBId,
              name: 'Other Project',
              description: 'Secret',
              slug: 'other-project',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
              archived_at: null as Date | null,
              ws_id: workspaceBId,
              ws_name: 'Workspace B',
              ws_slug: 'workspace-b',
              ws_status: 'active',
              ws_tenant_id: null as string | null,
              ws_created_at: new Date(),
              ws_updated_at: new Date(),
              member_id: null as string | null, // NO membership for User A
              role: null as string | null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(requireProjectAccess(projectBId, undefined, userAId)).rejects.toThrow(
      ProjectNotFoundError,
    );
  });

  // 5. Changing projectId cannot bypass authorization
  it('5. Changing projectId in request cannot bypass authorization', async () => {
    mockSql.mockImplementation(async (): Promise<{ rows: any[] }> => ({ rows: [] }));

    // Forged or unknown projectId throws 404
    await expect(requireProjectAccess('forged-project-id', undefined, userAId)).rejects.toThrow(
      ProjectNotFoundError,
    );
  });

  // 6. Changing workspaceId cannot bypass authorization
  it('6. Changing workspaceId cannot bypass authorization', async () => {
    mockSql.mockImplementation(async (): Promise<{ rows: any[] }> => ({ rows: [] }));

    // getProjectById with mismatched workspaceId returns null
    const result = await projectService.getProjectById(workspaceBId, projectAId);
    expect(result).toBeNull();
  });

  // 7. Non-member cannot create project in another workspace
  it('7. Non-member cannot create project in another workspace', async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const userId = values[0];
      const targetWs = values[1];
      if (userId === userAId && targetWs === workspaceBId) {
        return { rows: [] }; // No membership
      }
      return { rows: [] };
    });

    await expect(
      requireWorkspaceRole(workspaceBId, WORKSPACE_ROLES.AGENT, userAId),
    ).rejects.toThrow(WorkspaceAccessDeniedError);
  });

  // 8. Non-authorized role cannot archive project
  it('8. Non-authorized role (e.g. VIEWER) cannot archive project', async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const [userId, projectId] = values;
      if (userId === userAId && projectId === projectAId) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Admissions',
              slug: 'admissions',
              status: 'ACTIVE',
              ws_id: workspaceAId,
              ws_name: 'Workspace A',
              member_id: 'mem-1',
              role: 'VIEWER', // VIEWER role
              member_status: 'active',
            },
          ],
        };
      }
      return { rows: [] };
    });

    // Archiving requires at least ADMIN role
    await expect(
      requireProjectAccess(projectAId, WORKSPACE_ROLES.ADMIN, userAId),
    ).rejects.toThrow(RoleAuthorizationError);
  });

  // 9. Authorized role can archive project
  it('9. Authorized role (ADMIN / OWNER) can archive project', async () => {
    mockSql.mockImplementation(async (strings: any, ..._values: any[]): Promise<{ rows: any[] }> => {
      const queryStr = Array.isArray(strings) ? strings.join(' ') : String(strings);

      if (queryStr.includes('UPDATE projects') && queryStr.includes('ARCHIVED')) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Admissions',
              description: 'Handled admissions',
              slug: 'admissions',
              status: 'ARCHIVED',
              created_at: new Date(),
              updated_at: new Date(),
              archived_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const archived = await projectService.archiveProject(workspaceAId, projectAId);
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.archivedAt).toBeDefined();
  });

  // 10. Archived project is not shown in default active list
  it('10. Archived project is not shown in default active list', async () => {
    mockSql.mockImplementation(async (strings: any, ..._values: any[]): Promise<{ rows: any[] }> => {
      const queryStr = Array.isArray(strings) ? strings.join(' ') : String(strings);

      if (queryStr.includes('UPPER(status) = \'ACTIVE\'')) {
        // Return only active projects
        return {
          rows: [
            {
              id: 'active-project',
              workspace_id: workspaceAId,
              name: 'Active Project',
              description: null as string | null,
              slug: 'active-project',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
              archived_at: null as Date | null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const activeProjects = await projectService.getWorkspaceProjects(workspaceAId);
    expect(activeProjects).toHaveLength(1);
    expect(activeProjects[0].id).toBe('active-project');
    expect(activeProjects[0].status).toBe('ACTIVE');
  });

  // 11. Archived project remains in database
  it('11. Archived project remains in database and can be queried with status: ARCHIVED', async () => {
    mockSql.mockImplementation(async (strings: any, ..._values: any[]): Promise<{ rows: any[] }> => {
      const queryStr = Array.isArray(strings) ? strings.join(' ') : String(strings);

      if (queryStr.includes('UPPER(status) = \'ARCHIVED\'')) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Archived Admissions',
              description: null as string | null,
              slug: 'admissions',
              status: 'ARCHIVED',
              created_at: new Date(),
              updated_at: new Date(),
              archived_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const archivedProjects = await projectService.getWorkspaceProjects(workspaceAId, {
      status: 'ARCHIVED',
    });
    expect(archivedProjects).toHaveLength(1);
    expect(archivedProjects[0].id).toBe(projectAId);
    expect(archivedProjects[0].status).toBe('ARCHIVED');
    expect(archivedProjects[0].archivedAt).toBeDefined();
  });

  // 12. Project update cannot change workspace_id
  it('12. Project update cannot change workspace_id', async () => {
    mockSql.mockImplementation(async (strings: any, ..._values: any[]): Promise<{ rows: any[] }> => {
      const queryStr = Array.isArray(strings) ? strings.join(' ') : String(strings);

      if (queryStr.includes('SELECT') && queryStr.includes('FROM projects')) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Old Name',
              description: 'Old Desc',
              slug: 'old-name',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      if (queryStr.includes('UPDATE projects')) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId, // STRICTLY PRESERVED
              name: 'New Name',
              description: 'New Desc',
              slug: 'old-name',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const updated = await projectService.updateProject(workspaceAId, projectAId, {
      name: 'New Name',
      description: 'New Desc',
    });

    expect(updated.name).toBe('New Name');
    expect(updated.workspaceId).toBe(workspaceAId);
  });

  // 13. Workspace switcher only returns user's workspaces
  it("13. Workspace switcher only returns user's authorized workspaces", async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const userId = values[0];
      if (userId === userAId) {
        return {
          rows: [
            {
              id: workspaceAId,
              name: 'Wazzi Education',
              slug: 'wazzi-education',
              status: 'active',
              role: 'OWNER',
              member_status: 'active',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const userWorkspaces = await getUserWorkspaces(userAId);
    expect(userWorkspaces).toHaveLength(1);
    expect(userWorkspaces[0].id).toBe(workspaceAId);
    expect(userWorkspaces[0].name).toBe('Wazzi Education');
    // Workspace B is never included
    expect(userWorkspaces.some((w) => w.id === workspaceBId)).toBe(false);
  });

  // 14. Project switcher only returns projects from selected workspace
  it('14. Project switcher only returns projects from selected workspace', async () => {
    mockSql.mockImplementation(async (_strings: any, ...values: any[]): Promise<{ rows: any[] }> => {
      const wsId = values[0];
      if (wsId === workspaceAId) {
        return {
          rows: [
            {
              id: 'p1',
              workspace_id: workspaceAId,
              name: 'Admissions',
              slug: 'admissions',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              id: 'p2',
              workspace_id: workspaceAId,
              name: 'Support',
              slug: 'support',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const projectsA = await projectService.getWorkspaceProjects(workspaceAId);
    expect(projectsA).toHaveLength(2);
    expect(projectsA.every((p) => p.workspaceId === workspaceAId)).toBe(true);
  });

  // 15. Project creation correctly associates project with current workspace and generates scoped unique slug
  it('15. Project creation associates project with current workspace and generates scoped unique slug', async () => {
    let slugCheckCount = 0;
    mockSql.mockImplementation(async (strings: any, ..._values: any[]): Promise<{ rows: any[] }> => {
      const queryStr = Array.isArray(strings) ? strings.join(' ') : String(strings);

      if (queryStr.includes('SELECT id FROM projects WHERE workspace_id')) {
        slugCheckCount += 1;
        if (slugCheckCount === 1) {
          // First check: 'admissions' already exists in this workspace
          return { rows: [{ id: 'existing-id' }] };
        }
        // Second check: 'admissions-2' is available
        return { rows: [] };
      }

      if (queryStr.includes('INSERT INTO projects')) {
        return {
          rows: [
            {
              id: 'new-project-id',
              workspace_id: workspaceAId,
              name: 'Admissions',
              description: 'New admissions dept',
              slug: 'admissions-2', // Auto-incremented unique slug
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
              archived_at: null as Date | null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const created = await projectService.createProject(workspaceAId, {
      name: 'Admissions',
      description: 'New admissions dept',
    });

    expect(created.workspaceId).toBe(workspaceAId);
    expect(created.slug).toBe('admissions-2');
    expect(created.status).toBe('ACTIVE');
  });
});
