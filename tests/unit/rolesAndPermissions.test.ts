import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_ROLES,
  WORKSPACE_ROLE_LEVELS,
  hasRoleAtLeast,
  normalizeWorkspaceRole,
} from '@/lib/auth/roles';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsForRole,
} from '@/lib/auth/permissions';

describe('Roles and Permissions Foundation', () => {
  describe('Workspace Role Hierarchy', () => {
    it('ranks owner > admin > member > agent', () => {
      expect(WORKSPACE_ROLE_LEVELS.owner).toBeGreaterThan(WORKSPACE_ROLE_LEVELS.admin);
      expect(WORKSPACE_ROLE_LEVELS.admin).toBeGreaterThan(WORKSPACE_ROLE_LEVELS.member);
      expect(WORKSPACE_ROLE_LEVELS.member).toBeGreaterThan(WORKSPACE_ROLE_LEVELS.agent);
    });

    it('validates hasRoleAtLeast correctly', () => {
      // Owner satisfies all
      expect(hasRoleAtLeast(WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.OWNER)).toBe(true);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN)).toBe(true);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.MEMBER)).toBe(true);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.AGENT)).toBe(true);

      // Admin satisfies admin, member, agent but NOT owner
      expect(hasRoleAtLeast(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.OWNER)).toBe(false);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.ADMIN)).toBe(true);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER)).toBe(true);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.AGENT)).toBe(true);

      // Member satisfies member and agent
      expect(hasRoleAtLeast(WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.ADMIN)).toBe(false);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.MEMBER)).toBe(true);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.AGENT)).toBe(true);

      // Agent satisfies only agent
      expect(hasRoleAtLeast(WORKSPACE_ROLES.AGENT, WORKSPACE_ROLES.MEMBER)).toBe(false);
      expect(hasRoleAtLeast(WORKSPACE_ROLES.AGENT, WORKSPACE_ROLES.AGENT)).toBe(true);

      // Null or empty role fails
      expect(hasRoleAtLeast(null, WORKSPACE_ROLES.AGENT)).toBe(false);
      expect(hasRoleAtLeast(undefined, WORKSPACE_ROLES.AGENT)).toBe(false);
    });

    it('normalizes arbitrary role inputs safely', () => {
      expect(normalizeWorkspaceRole('OWNER')).toBe(WORKSPACE_ROLES.OWNER);
      expect(normalizeWorkspaceRole('admin ')).toBe(WORKSPACE_ROLES.ADMIN);
      expect(normalizeWorkspaceRole('Agent')).toBe(WORKSPACE_ROLES.AGENT);
      expect(normalizeWorkspaceRole('invalid_role')).toBe(WORKSPACE_ROLES.MEMBER);
      expect(normalizeWorkspaceRole(null)).toBe(WORKSPACE_ROLES.MEMBER);
    });
  });

  describe('Permission Matrix', () => {
    it('grants full access to Owner and Admin', () => {
      expect(hasPermission(WORKSPACE_ROLES.OWNER, PERMISSIONS.WORKSPACE_DELETE)).toBe(true);
      expect(hasPermission(WORKSPACE_ROLES.OWNER, PERMISSIONS.MEMBERS_INVITE)).toBe(true);
      expect(hasPermission(WORKSPACE_ROLES.OWNER, PERMISSIONS.WHATSAPP_CONNECT)).toBe(true);

      expect(hasPermission(WORKSPACE_ROLES.ADMIN, PERMISSIONS.MEMBERS_INVITE)).toBe(true);
      expect(hasPermission(WORKSPACE_ROLES.ADMIN, PERMISSIONS.WHATSAPP_CONNECT)).toBe(true);
    });

    it('prevents Member and Agent from performing administrative tasks', () => {
      expect(hasPermission(WORKSPACE_ROLES.MEMBER, PERMISSIONS.WORKSPACE_DELETE)).toBe(false);
      expect(hasPermission(WORKSPACE_ROLES.MEMBER, PERMISSIONS.MEMBERS_INVITE)).toBe(false);
      expect(hasPermission(WORKSPACE_ROLES.MEMBER, PERMISSIONS.WHATSAPP_CONNECT)).toBe(false);

      expect(hasPermission(WORKSPACE_ROLES.AGENT, PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
      expect(hasPermission(WORKSPACE_ROLES.AGENT, PERMISSIONS.MEMBERS_VIEW)).toBe(true);
      expect(hasPermission(WORKSPACE_ROLES.AGENT, PERMISSIONS.MESSAGES_SEND)).toBe(true);
      expect(hasPermission(WORKSPACE_ROLES.AGENT, PERMISSIONS.MESSAGES_READ)).toBe(true);
    });

    it('returns all assigned permissions with getPermissionsForRole', () => {
      const ownerPerms = getPermissionsForRole(WORKSPACE_ROLES.OWNER);
      expect(ownerPerms).toContain(PERMISSIONS.WORKSPACE_DELETE);
      expect(ownerPerms.length).toBe(ROLE_PERMISSIONS.owner.length);

      const agentPerms = getPermissionsForRole(WORKSPACE_ROLES.AGENT);
      expect(agentPerms).not.toContain(PERMISSIONS.WORKSPACE_DELETE);
      expect(agentPerms).toContain(PERMISSIONS.MESSAGES_SEND);
    });
  });
});
