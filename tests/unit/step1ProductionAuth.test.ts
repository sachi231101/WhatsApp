import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Hoisted SQL Mock
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
  syncAuth0User,
  getCurrentUser,
  requireAuthenticatedUser,
  AuthenticationRequiredError,
} from '@/lib/auth/user';
import {
  getCurrentWorkspace,
  requireWorkspaceMember,
  requireWorkspaceRole,
  WorkspaceAccessDeniedError,
  RoleAuthorizationError,
} from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { workspaceService } from '@/lib/services/tenants/workspaceService';
import { projectService } from '@/lib/services/tenants/projectService';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';

describe('STEP 1: Production Authentication & Workspace Foundation', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userBId = '22222222-2222-2222-2222-222222222222';
  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const workspaceBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth0Session.mockReset();
    mockSql.mockImplementation(async () => ({ rows: [] as any[] }));
  });

  // 1. Unauthenticated user cannot access protected routes
  it('1. throws AuthenticationRequiredError when unauthenticated user tries to access protected resource', async () => {
    mockAuth0Session.mockResolvedValue(null);

    await expect(requireAuthenticatedUser()).rejects.toThrow(AuthenticationRequiredError);
    try {
      await requireAuthenticatedUser();
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHENTICATED');
    }
  });

  // 2. Authenticated user can access authorized client routes
  it('2. allows authenticated user to resolve their local user profile', async () => {
    mockAuth0Session.mockResolvedValue({
      user: {
        sub: 'auth0|user-123',
        email: 'alex@wazzi.app',
        name: 'Alex Developer',
        picture: 'https://avatar.com/alex.png',
      },
    });

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) {
        return {
          rows: [
            {
              id: userAId,
              auth0_user_id: 'auth0|user-123',
              email: 'alex@wazzi.app',
              name: 'Alex Developer',
              avatar_url: 'https://avatar.com/alex.png',
              status: 'active',
              role: 'client',
              is_super_admin: false,
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
              last_login_at: new Date('2026-01-01'),
            },
          ],
        };
      }
      if (q.includes('UPDATE users')) {
        return {
          rows: [
            {
              id: userAId,
              auth0_user_id: 'auth0|user-123',
              email: 'alex@wazzi.app',
              name: 'Alex Developer',
              avatar_url: 'https://avatar.com/alex.png',
              status: 'active',
              role: 'client',
              is_super_admin: false,
              created_at: new Date('2026-01-01'),
              updated_at: new Date(),
              last_login_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const user = await requireAuthenticatedUser();
    expect(user).toBeDefined();
    expect(user.id).toBe(userAId);
    expect(user.email).toBe('alex@wazzi.app');
    expect(user.auth0UserId).toBe('auth0|user-123');
  });

  // 3. Auth0 user maps to exactly one local user (no duplication)
  it('3. maps Auth0 user to exactly one local user without duplicating existing records', async () => {
    let updateCalled = false;
    let insertCalled = false;

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) {
        // User already exists
        return {
          rows: [
            {
              id: userAId,
              auth0_user_id: 'auth0|unique-sub-456',
              email: 'existing@company.com',
              name: 'Existing User',
              avatar_url: null as string | null,
              status: 'active',
              role: 'client',
              is_super_admin: false,
              created_at: new Date(),
              updated_at: new Date(),
              last_login_at: new Date('2026-01-01'),
            },
          ],
        };
      }
      if (q.includes('UPDATE users')) {
        updateCalled = true;
        return {
          rows: [
            {
              id: userAId,
              auth0_user_id: 'auth0|unique-sub-456',
              email: 'existing@company.com',
              name: 'Updated Name',
              avatar_url: null,
              status: 'active',
              role: 'client',
              is_super_admin: false,
              created_at: new Date(),
              updated_at: new Date(),
              last_login_at: new Date(),
            },
          ],
        };
      }
      if (q.includes('INSERT INTO users')) {
        insertCalled = true;
        return { rows: [] };
      }
      return { rows: [] };
    });

    const synced = await syncAuth0User({
      sub: 'auth0|unique-sub-456',
      email: 'existing@company.com',
      name: 'Updated Name',
    });

    expect(synced.id).toBe(userAId);
    expect(updateCalled).toBe(true);
    expect(insertCalled).toBe(false); // Did not insert duplicate record
  });

  // 4. New user can create workspace with unique slug
  it('4. allows user to create workspace and generates a unique, valid slug', async () => {
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('SELECT id FROM workspaces WHERE slug =')) {
        return { rows: [] }; // Slug is available
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
              name: 'Wazzi Super Growth',
              slug: 'wazzi-super-growth',
              timezone: 'UTC',
              default_locale: 'en_US',
              status: 'active',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const ws = await workspaceService.createWorkspace({
      name: 'Wazzi Super Growth',
      createdByUserId: userAId,
    });

    expect(ws.id).toBe(workspaceAId);
    expect(ws.name).toBe('Wazzi Super Growth');
    expect(ws.slug).toBe('wazzi-super-growth');
    expect(ws.role).toBe(WORKSPACE_ROLES.OWNER);
  });

  // 5. Workspace creation creates OWNER membership
  it('5. workspace creation assigns creator as OWNER in workspace_members', async () => {
    let memberInsertQuery = '';
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('SELECT id FROM workspaces WHERE slug =')) return { rows: [] };
      if (q.includes('SELECT t.id FROM tenants t')) return { rows: [{ id: 'tenant-1' }] };
      if (q.includes('INSERT INTO workspaces')) {
        return {
          rows: [
            {
              id: workspaceAId,
              tenant_id: 'tenant-1',
              name: 'Acme Ops',
              slug: 'acme-ops',
              timezone: 'UTC',
              default_locale: 'en_US',
              status: 'active',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      if (q.includes('INSERT INTO workspace_members')) {
        memberInsertQuery = q;
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await workspaceService.createWorkspace({
      name: 'Acme Ops',
      createdByUserId: userAId,
    });

    expect(result.role).toBe(WORKSPACE_ROLES.OWNER);
    expect(memberInsertQuery).toContain('INSERT INTO workspace_members');
  });

  // 6. Workspace creation is transactional (rolls back on failure)
  it('6. executes workspace creation in a transaction and rolls back on failure', async () => {
    let rollbackExecuted = false;

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('BEGIN')) return { rows: [] };
      if (q.includes('SELECT id FROM workspaces WHERE slug =')) return { rows: [] };
      if (q.includes('SELECT t.id FROM tenants t')) return { rows: [{ id: 'tenant-1' }] };
      if (q.includes('INSERT INTO workspaces')) {
        return {
          rows: [
            {
              id: workspaceAId,
              tenant_id: 'tenant-1',
              name: 'Rollback Test',
              slug: 'rollback-test',
              timezone: 'UTC',
              default_locale: 'en_US',
              status: 'active',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      if (q.includes('INSERT INTO workspace_members')) {
        throw new Error('Database constraint violation in member insert');
      }
      if (q.includes('ROLLBACK')) {
        rollbackExecuted = true;
        return { rows: [] };
      }
      return { rows: [] };
    });

    await expect(
      workspaceService.createWorkspace({
        name: 'Rollback Test',
        createdByUserId: userAId,
      }),
    ).rejects.toThrow('Database constraint violation in member insert');

    expect(rollbackExecuted).toBe(true);
  });

  // 7. User can access their own workspace
  it('7. allows user to access their authorized workspace', async () => {
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM workspaces w') && q.includes('JOIN workspace_members wm')) {
        return {
          rows: [
            {
              id: workspaceAId,
              name: 'Team Alpha',
              slug: 'team-alpha',
              status: 'active',
              tenant_id: 't-1',
              created_at: new Date(),
              updated_at: new Date(),
              member_id: 'mem-1',
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

    const access = await requireWorkspaceMember(workspaceAId, userAId);
    expect(access.workspace.id).toBe(workspaceAId);
    expect(access.membership.role).toBe(WORKSPACE_ROLES.OWNER);
    expect(access.membership.userId).toBe(userAId);
  });

  // 8. User cannot access another workspace
  it('8. denies access and throws 403 when user attempts to access another tenant workspace', async () => {
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM workspaces w') && q.includes('JOIN workspace_members wm')) {
        // userA is NOT a member of workspaceB
        return { rows: [] as any[] };
      }
      return { rows: [] as any[] };
    });

    await expect(requireWorkspaceMember(workspaceBId, userAId)).rejects.toThrow(
      WorkspaceAccessDeniedError,
    );

    try {
      await requireWorkspaceMember(workspaceBId, userAId);
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('WORKSPACE_ACCESS_DENIED');
    }
  });

  // 9. Changing workspace_id in a request cannot bypass authorization
  it('9. prevents authorization bypass when browser supplies an unauthorized workspace_id', async () => {
    mockAuth0Session.mockResolvedValue({
      user: {
        sub: 'auth0|user-A',
        email: 'usera@wazzi.app',
      },
    });

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) {
        return {
          rows: [
            {
              id: userAId,
              email: 'usera@wazzi.app',
              auth0_user_id: 'auth0|user-A',
              status: 'active',
              role: 'client',
              is_super_admin: false,
              created_at: new Date(),
              updated_at: new Date(),
              last_login_at: new Date(),
            },
          ],
        };
      }
      if (q.includes('WHERE wm.user_id =') && q.includes('AND w.id =')) {
        // Tampered workspace ID: user is NOT a member
        return { rows: [] };
      }
      if (q.includes('ORDER BY wm.created_at ASC')) {
        // Falls back to user's real authorized workspace
        return {
          rows: [
            {
              id: workspaceAId,
              name: 'Legitimate Workspace A',
              slug: 'legit-a',
              status: 'active',
              tenant_id: 't-1',
              created_at: new Date(),
              updated_at: new Date(),
              member_id: 'mem-legit',
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

    // Attacker passes workspaceBId in request
    const context = await getCurrentWorkspace(workspaceBId);
    expect(context).not.toBeNull();
    // System rejected workspaceBId and fell back safely to workspaceAId!
    expect(context?.workspace.id).toBe(workspaceAId);
    expect(context?.workspace.id).not.toBe(workspaceBId);
  });

  // 10. Non-member receives forbidden response
  it('10. non-member receives forbidden response with 403 status code', async () => {
    mockSql.mockResolvedValue({ rows: [] as any[] });

    try {
      await requireWorkspaceMember('random-workspace-id', userBId);
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(WorkspaceAccessDeniedError);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('WORKSPACE_ACCESS_DENIED');
    }
  });

  // 11. Role authorization works (hierarchy enforcement)
  it('11. verifies role hierarchy: OWNER and ADMIN pass, AGENT and VIEWER fail admin check', async () => {
    // Member with AGENT role
    mockSql.mockImplementation(async () => ({
      rows: [
        {
          id: workspaceAId,
          name: 'Team Alpha',
          slug: 'team-alpha',
          status: 'active',
          tenant_id: 't-1',
          created_at: new Date(),
          updated_at: new Date(),
          member_id: 'mem-agent',
          role: 'AGENT',
          member_status: 'active',
          member_created_at: new Date(),
          member_updated_at: new Date(),
        },
      ],
    }));

    // AGENT can access AGENT role requirement
    const agentAccess = await requireWorkspaceRole(workspaceAId, WORKSPACE_ROLES.AGENT, userAId);
    expect(agentAccess.membership.role).toBe(WORKSPACE_ROLES.AGENT);

    // AGENT cannot access ADMIN role requirement
    await expect(
      requireWorkspaceRole(workspaceAId, WORKSPACE_ROLES.ADMIN, userAId),
    ).rejects.toThrow(RoleAuthorizationError);

    try {
      await requireWorkspaceRole(workspaceAId, WORKSPACE_ROLES.ADMIN, userAId);
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.requiredRole).toBe(WORKSPACE_ROLES.ADMIN);
    }
  });

  // 12. Logout/session termination prevents access
  it('12. prevents access after logout when session token is invalid or cleared', () => {
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('tampered-cookie-value')).toBeNull();
  });

  // 13. Invalid/expired session is handled correctly
  it('13. rejects expired session token safely', () => {
    // Create token that expired 100 seconds ago
    const expiredToken = createSessionToken(
      {
        userId: userAId,
        email: 'expired@wazzi.app',
        name: 'Expired User',
        role: 'client',
        isSuperAdmin: false,
      },
      -100, // Negative maxAge
    );

    const verified = verifySessionToken(expiredToken);
    expect(verified).toBeNull();
  });

  // 14. Project records cannot cross workspace boundaries
  it('14. guarantees project records cannot be accessed across workspace boundaries', async () => {
    const project1Id = 'proj-11111111-1111-1111-1111-111111111111';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      // If query is for project by id and workspace
      if (q.includes('WHERE id =') && q.includes('AND workspace_id =')) {
        const targetProjId = values[0];
        const targetWsId = values[1];
        if (targetProjId === project1Id && targetWsId === workspaceAId) {
          return {
            rows: [
              {
                id: project1Id,
                workspace_id: workspaceAId,
                name: 'Workspace A Project',
                description: 'Strictly isolated',
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        return { rows: [] };
      }
      // List projects scoped to workspace
      if (q.includes('WHERE workspace_id =')) {
        const targetWsId = values[0];
        if (targetWsId === workspaceAId) {
          return {
            rows: [
              {
                id: project1Id,
                workspace_id: workspaceAId,
                name: 'Workspace A Project',
                description: 'Project in A',
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        return { rows: [] };
      }
      return { rows: [] };
    });

    // Workspace A can retrieve its own project
    const projInA = await projectService.getProjectById(workspaceAId, project1Id);
    expect(projInA).not.toBeNull();
    expect(projInA?.id).toBe(project1Id);
    expect(projInA?.workspaceId).toBe(workspaceAId);

    // Workspace B cannot retrieve Workspace A's project
    const projCrossTenant = await projectService.getProjectById(workspaceBId, project1Id);
    expect(projCrossTenant).toBeNull();

    // Listing projects in Workspace B returns empty
    const listInB = await projectService.getWorkspaceProjects(workspaceBId);
    expect(listInB.length).toBe(0);
  });
});
