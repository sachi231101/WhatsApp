/**
 * Platform and Workspace Role definitions and hierarchy for multi-tenant access control.
 */

export const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  USER: 'user',
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  AGENT: 'agent',
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

/**
 * Numeric weight for role hierarchy comparisons.
 * owner (40) > admin (30) > member (20) > agent (10)
 */
export const WORKSPACE_ROLE_LEVELS: Record<WorkspaceRole, number> = {
  [WORKSPACE_ROLES.OWNER]: 40,
  [WORKSPACE_ROLES.ADMIN]: 30,
  [WORKSPACE_ROLES.MEMBER]: 20,
  [WORKSPACE_ROLES.AGENT]: 10,
};

/**
 * Checks if the given role satisfies or exceeds the minimum required role level.
 */
export function hasRoleAtLeast(
  currentRole: WorkspaceRole | string | undefined | null,
  requiredRole: WorkspaceRole,
): boolean {
  if (!currentRole) return false;
  const currentLevel = WORKSPACE_ROLE_LEVELS[currentRole as WorkspaceRole] ?? 0;
  const requiredLevel = WORKSPACE_ROLE_LEVELS[requiredRole] ?? 0;
  return currentLevel >= requiredLevel;
}

/**
 * Normalizes an arbitrary role string into a valid WorkspaceRole, falling back to 'member'.
 */
export function normalizeWorkspaceRole(role: string | undefined | null): WorkspaceRole {
  if (!role) return WORKSPACE_ROLES.MEMBER;
  const lower = role.toLowerCase().trim();
  if (lower === WORKSPACE_ROLES.OWNER) return WORKSPACE_ROLES.OWNER;
  if (lower === WORKSPACE_ROLES.ADMIN) return WORKSPACE_ROLES.ADMIN;
  if (lower === WORKSPACE_ROLES.AGENT) return WORKSPACE_ROLES.AGENT;
  return WORKSPACE_ROLES.MEMBER;
}
