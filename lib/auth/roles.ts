/**
 * Platform and Workspace Role definitions and hierarchy for multi-tenant access control.
 */

export const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  SUPPORT_ADMIN: 'support_admin',
  FINANCE_ADMIN: 'finance_admin',
  OPERATIONS_ADMIN: 'operations_admin',
  USER: 'user',
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const PLATFORM_ROLE_LEVELS: Record<string, number> = {
  super_admin: 100,
  SUPER_ADMIN: 100,
  platform_admin: 80,
  PLATFORM_ADMIN: 80,
  finance_admin: 60,
  FINANCE_ADMIN: 60,
  operations_admin: 60,
  OPERATIONS_ADMIN: 60,
  support_admin: 40,
  SUPPORT_ADMIN: 40,
  user: 10,
  USER: 10,
};

export function normalizePlatformRole(role: string | undefined | null): PlatformRole {
  if (!role) return PLATFORM_ROLES.USER;
  const lower = role.toLowerCase().trim();
  if (lower === 'super_admin' || lower === 'super-admin') return PLATFORM_ROLES.SUPER_ADMIN;
  if (lower === 'platform_admin' || lower === 'platform-admin') return PLATFORM_ROLES.PLATFORM_ADMIN;
  if (lower === 'support_admin' || lower === 'support-admin') return PLATFORM_ROLES.SUPPORT_ADMIN;
  if (lower === 'finance_admin' || lower === 'finance-admin') return PLATFORM_ROLES.FINANCE_ADMIN;
  if (lower === 'operations_admin' || lower === 'operations-admin') return PLATFORM_ROLES.OPERATIONS_ADMIN;
  return PLATFORM_ROLES.USER;
}

export function hasPlatformRoleAtLeast(
  currentRole: PlatformRole | string | undefined | null,
  requiredRole: PlatformRole | string,
): boolean {
  if (!currentRole) return false;
  const currentKey = String(currentRole).trim().toLowerCase();
  const requiredKey = String(requiredRole).trim().toLowerCase();
  const currentLevel = PLATFORM_ROLE_LEVELS[currentKey] ?? 0;
  const requiredLevel = PLATFORM_ROLE_LEVELS[requiredKey] ?? 0;
  return currentLevel >= requiredLevel;
}

export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  AGENT: 'agent',
  VIEWER: 'viewer',
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

/**
 * Numeric weight for role hierarchy comparisons.
 * owner (50) > admin (40) > manager (30) > member (20) > agent (15) > viewer (10)
 */
export const WORKSPACE_ROLE_LEVELS: Record<string, number> = {
  owner: 50,
  OWNER: 50,
  admin: 40,
  ADMIN: 40,
  manager: 30,
  MANAGER: 30,
  member: 20,
  MEMBER: 20,
  agent: 15,
  AGENT: 15,
  viewer: 10,
  VIEWER: 10,
};

/**
 * Normalizes an arbitrary role string into a valid WorkspaceRole.
 */
export function normalizeWorkspaceRole(role: string | undefined | null): WorkspaceRole {
  if (!role) return WORKSPACE_ROLES.MEMBER;
  const lower = role.toLowerCase().trim();
  if (lower === 'owner') return WORKSPACE_ROLES.OWNER;
  if (lower === 'admin') return WORKSPACE_ROLES.ADMIN;
  if (lower === 'manager') return WORKSPACE_ROLES.MANAGER;
  if (lower === 'agent') return WORKSPACE_ROLES.AGENT;
  if (lower === 'viewer') return WORKSPACE_ROLES.VIEWER;
  if (lower === 'member') return WORKSPACE_ROLES.MEMBER;
  return WORKSPACE_ROLES.MEMBER;
}

/**
 * Checks if the given role satisfies or exceeds the minimum required role level.
 */
export function hasRoleAtLeast(
  currentRole: WorkspaceRole | string | undefined | null,
  requiredRole: WorkspaceRole | string,
): boolean {
  if (!currentRole) return false;
  const currentKey = String(currentRole).trim().toLowerCase();
  const requiredKey = String(requiredRole).trim().toLowerCase();
  const currentLevel = WORKSPACE_ROLE_LEVELS[currentKey] ?? 0;
  const requiredLevel = WORKSPACE_ROLE_LEVELS[requiredKey] ?? 0;
  return currentLevel >= requiredLevel;
}
