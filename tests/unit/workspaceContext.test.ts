import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSql, sqlMockObj } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });
  return { mockSql: mockFn, sqlMockObj: obj };
});

vi.mock('@vercel/postgres', () => ({
  sql: sqlMockObj,
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => ({
  sql: sqlMockObj,
}));

import { resolveWorkspaceContext } from '@/lib/auth/context';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { PERMISSIONS } from '@/lib/auth/permissions';

describe('Workspace Context Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockImplementation(async (strings: any) => {
      const query = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (query.includes('CREATE TABLE')) {
        return { rows: [] as any[] };
      }
      return { rows: [] as any[] };
    });
  });

  it('resolves requested workspace context when user is a valid member', async () => {
    const wsId = '00000000-0000-0000-0000-000000000099';
    const tenantId = '00000000-0000-0000-0000-000000000088';
    const userId = '00000000-0000-0000-0000-000000000077';

    mockSql.mockImplementation(async (strings: any) => {
      const query = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (query.includes('CREATE TABLE')) {
        return { rows: [] };
      }
      if (query.includes('INSERT INTO users')) {
        return {
          rows: [{ id: userId, email: 'alex@example.com', name: 'Alex', is_super_admin: false }],
        };
      }
      if (query.includes('WHERE wm.user_id') && query.includes('AND w.id =')) {
        return {
          rows: [
            {
              workspace_id: wsId,
              workspace_name: 'Engineering Team',
              tenant_id: tenantId,
              tenant_name: 'Acme Corp',
              role: 'admin',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const context = await resolveWorkspaceContext('alex@example.com', 'Alex', wsId);

    expect(context.userId).toBe(userId);
    expect(context.workspaceId).toBe(wsId);
    expect(context.workspaceName).toBe('Engineering Team');
    expect(context.tenantId).toBe(tenantId);
    expect(context.role).toBe(WORKSPACE_ROLES.ADMIN);
    expect(context.permissions).toContain(PERMISSIONS.WHATSAPP_CONNECT);
    expect(context.isSuperAdmin).toBe(false);
  });

  it('falls back to default workspace when requested workspace is not found', async () => {
    const defaultWsId = '00000000-0000-0000-0000-000000000001';
    const nonMemberWsId = '00000000-0000-0000-0000-000000000999';

    mockSql.mockImplementation(async (strings: any) => {
      const query = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (query.includes('CREATE TABLE')) {
        return { rows: [] };
      }
      if (query.includes('INSERT INTO users')) {
        return {
          rows: [{ id: 'user-1', email: 'test@example.com', name: 'Test', is_super_admin: false }],
        };
      }
      if (query.includes('WHERE wm.user_id') && query.includes('AND w.id =')) {
        // Not a member of nonMemberWsId
        return { rows: [] };
      }
      if (query.includes('ORDER BY wm.created_at ASC')) {
        // Fallback default workspace
        return {
          rows: [
            {
              workspace_id: defaultWsId,
              workspace_name: 'Default Workspace',
              tenant_id: 'tenant-1',
              tenant_name: 'Default Tenant',
              role: 'member',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const context = await resolveWorkspaceContext('test@example.com', 'Test', nonMemberWsId);

    expect(context.workspaceId).toBe(defaultWsId);
    expect(context.role).toBe(WORKSPACE_ROLES.MEMBER);
    expect(context.permissions).toContain(PERMISSIONS.MESSAGES_SEND);
    expect(context.permissions).not.toContain(PERMISSIONS.WORKSPACE_DELETE);
  });

  it('uses deterministic fallback context on database failure without throwing', async () => {
    mockSql.mockRejectedValue(new Error('Postgres connection timeout'));

    const context = await resolveWorkspaceContext('dev@example.com', 'Dev User');

    expect(context.role).toBe(WORKSPACE_ROLES.OWNER);
    expect(context.permissions).toContain(PERMISSIONS.WORKSPACE_DELETE);
    expect(context.workspaceName).toBe('Default Workspace');
  });
});
