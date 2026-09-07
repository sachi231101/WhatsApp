import { describe, it, expect } from 'vitest';
import {
  assertWorkspaceAccess,
  requirePermission,
  scopedQuery,
  WorkspaceAccessDeniedError,
  PermissionDeniedError,
} from '@/lib/auth/tenantIsolation';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';

describe('Tenant Isolation Helpers', () => {
  const wsA = '00000000-0000-0000-0000-00000000000a';
  const wsB = '00000000-0000-0000-0000-00000000000b';

  describe('assertWorkspaceAccess', () => {
    it('allows access when context matches requested workspace', () => {
      const context = {
        userId: 'user-1',
        workspaceId: wsA,
        role: WORKSPACE_ROLES.MEMBER,
      };

      expect(() => assertWorkspaceAccess(wsA, context)).not.toThrow();
    });

    it('denies access and throws 403 when context does not match target workspace', () => {
      const context = {
        userId: 'user-1',
        workspaceId: wsA,
        role: WORKSPACE_ROLES.MEMBER,
      };

      expect(() => assertWorkspaceAccess(wsB, context)).toThrow(WorkspaceAccessDeniedError);
      try {
        assertWorkspaceAccess(wsB, context);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('WORKSPACE_ACCESS_DENIED');
      }
    });

    it('allows SuperAdmin to bypass workspace boundaries', () => {
      const superAdminContext = {
        userId: 'super-user',
        workspaceId: wsA,
        role: WORKSPACE_ROLES.MEMBER,
        isSuperAdmin: true,
      };

      expect(() => assertWorkspaceAccess(wsB, superAdminContext)).not.toThrow();
    });
  });

  describe('requirePermission', () => {
    it('allows when role has the permission', () => {
      const ownerContext = {
        userId: 'user-owner',
        workspaceId: wsA,
        role: WORKSPACE_ROLES.OWNER,
      };

      expect(() => requirePermission(ownerContext, PERMISSIONS.WORKSPACE_DELETE)).not.toThrow();
    });

    it('throws PermissionDeniedError when role lacks permission', () => {
      const agentContext = {
        userId: 'user-agent',
        workspaceId: wsA,
        role: WORKSPACE_ROLES.AGENT,
      };

      expect(() => requirePermission(agentContext, PERMISSIONS.WORKSPACE_DELETE)).toThrow(
        PermissionDeniedError,
      );

      try {
        requirePermission(agentContext, PERMISSIONS.WORKSPACE_DELETE);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('PERMISSION_DENIED');
        expect(err.requiredPermission).toBe(PERMISSIONS.WORKSPACE_DELETE);
      }
    });

    it('allows SuperAdmin to bypass permission checks', () => {
      const superAdminContext = {
        userId: 'super-user',
        workspaceId: wsA,
        role: WORKSPACE_ROLES.AGENT,
        isSuperAdmin: true,
      };

      expect(() => requirePermission(superAdminContext, PERMISSIONS.WORKSPACE_DELETE)).not.toThrow();
    });
  });

  describe('scopedQuery', () => {
    it('returns workspaceId filter object', () => {
      const filter = scopedQuery(wsA);
      expect(filter).toEqual({ workspaceId: wsA });
    });

    it('throws if workspaceId is missing or empty', () => {
      expect(() => scopedQuery('')).toThrow('Tenant isolation assertion failed');
    });
  });
});
