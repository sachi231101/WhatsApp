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

import { workspaceService } from '@/lib/services/tenants/workspaceService';
import { projectService } from '@/lib/services/tenants/projectService';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';

describe('Automatic Project Creation on Workspace Creation', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectAId = 'project-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockImplementation(async (): Promise<{ rows: any[] }> => ({ rows: [] }));
  });

  it('1. createWorkspace automatically inserts a default project in the transaction', async () => {
    let projectInsertExecuted = false;
    let projectInsertValues: any = null;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('?') : String(strings || '');

      if (q.includes('SELECT id FROM workspaces WHERE slug =')) {
        return { rows: [] };
      }
      if (q.includes('SELECT t.id FROM tenants t')) {
        return { rows: [{ id: 'tenant-1' }] };
      }
      if (q.includes('INSERT INTO workspaces')) {
        return {
          rows: [
            {
              id: workspaceAId,
              tenant_id: 'tenant-1',
              name: 'Acme Enterprise',
              slug: 'acme-enterprise',
              timezone: 'UTC',
              default_locale: 'en_US',
              status: 'active',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
            },
          ],
        };
      }
      if (q.includes('INSERT INTO workspace_members')) {
        return { rows: [] };
      }
      if (q.includes('INSERT INTO projects')) {
        projectInsertExecuted = true;
        projectInsertValues = values;
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: values[1] || 'Default Project',
              description: values[2] || 'Default project for Acme Enterprise',
              slug: values[3] || 'default',
              status: 'ACTIVE',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await workspaceService.createWorkspace({
      name: 'Acme Enterprise',
      createdByUserId: userAId,
    });

    expect(result.id).toBe(workspaceAId);
    expect(result.role).toBe(WORKSPACE_ROLES.OWNER);
    expect(projectInsertExecuted).toBe(true);
    expect(result.defaultProjectId).toBe(projectAId);
    expect(result.defaultProject).toBeDefined();
    expect(result.defaultProject?.name).toBe('Default Project');
    expect(result.defaultProject?.slug).toBe('default');
    expect(result.defaultProject?.status).toBe('ACTIVE');
  });

  it('2. createWorkspace supports custom projectName and projectSlug', async () => {
    let insertedProjectName = '';
    let insertedProjectSlug = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('?') : String(strings || '');

      if (q.includes('SELECT id FROM workspaces WHERE slug =')) return { rows: [] };
      if (q.includes('SELECT t.id FROM tenants t')) return { rows: [{ id: 'tenant-1' }] };
      if (q.includes('INSERT INTO workspaces')) {
        return {
          rows: [
            {
              id: workspaceAId,
              tenant_id: 'tenant-1',
              name: 'Initech Corp',
              slug: 'initech-corp',
              timezone: 'UTC',
              default_locale: 'en_US',
              status: 'active',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      if (q.includes('INSERT INTO projects')) {
        insertedProjectName = values[1];
        insertedProjectSlug = values[3];
        return {
          rows: [
            {
              id: 'custom-proj-id',
              workspace_id: workspaceAId,
              name: insertedProjectName,
              description: 'Custom description',
              slug: insertedProjectSlug,
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await workspaceService.createWorkspace({
      name: 'Initech Corp',
      projectName: 'Main Operations',
      projectSlug: 'operations',
      createdByUserId: userAId,
    });

    expect(insertedProjectName).toBe('Main Operations');
    expect(insertedProjectSlug).toBe('operations');
    expect(result.defaultProjectId).toBe('custom-proj-id');
    expect(result.defaultProject?.name).toBe('Main Operations');
  });

  it('3. ensureDefaultProject returns existing active project if one already exists', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('?') : String(strings || '');
      if (q.includes('SELECT id, workspace_id, name')) {
        return {
          rows: [
            {
              id: 'existing-proj-1',
              workspace_id: workspaceAId,
              name: 'Existing Alpha Project',
              description: 'Already here',
              slug: 'alpha',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const proj = await projectService.ensureDefaultProject(workspaceAId);
    expect(proj.id).toBe('existing-proj-1');
    expect(proj.name).toBe('Existing Alpha Project');
  });

  it('4. ensureDefaultProject creates a default project if workspace has none', async () => {
    let created = false;
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('?') : String(strings || '');
      if (q.includes('SELECT id, workspace_id, name')) {
        return { rows: [] }; // No existing projects
      }
      if (q.includes('SELECT id FROM projects WHERE workspace_id =')) {
        return { rows: [] }; // Slug is free
      }
      if (q.includes('INSERT INTO projects')) {
        created = true;
        return {
          rows: [
            {
              id: 'newly-created-proj',
              workspace_id: workspaceAId,
              name: 'Default Project',
              description: 'Default project for workspace',
              slug: 'default',
              status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const proj = await projectService.ensureDefaultProject(workspaceAId);
    expect(created).toBe(true);
    expect(proj.id).toBe('newly-created-proj');
    expect(proj.name).toBe('Default Project');
  });
});
