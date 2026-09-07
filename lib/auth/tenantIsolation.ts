import { type PermissionCode, hasPermission } from './permissions';
import { type WorkspaceRole } from './roles';

export interface BaseWorkspaceContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole | string;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export class WorkspaceAccessDeniedError extends Error {
  public statusCode = 403;
  public code = 'WORKSPACE_ACCESS_DENIED';

  constructor(message = 'Access to this workspace is denied.') {
    super(message);
    this.name = 'WorkspaceAccessDeniedError';
  }
}

export class PermissionDeniedError extends Error {
  public statusCode = 403;
  public code = 'PERMISSION_DENIED';
  public requiredPermission: PermissionCode;

  constructor(permission: PermissionCode, message?: string) {
    super(message || `Permission denied: '${permission}' is required for this action.`);
    this.name = 'PermissionDeniedError';
    this.requiredPermission = permission;
  }
}

/**
 * Asserts that the caller has access to the requested workspace.
 * SuperAdmins bypass isolation checks.
 */
export function assertWorkspaceAccess(
  targetWorkspaceId: string,
  context: BaseWorkspaceContext,
): void {
  if (context.isSuperAdmin) {
    return;
  }

  if (!context.workspaceId || context.workspaceId !== targetWorkspaceId) {
    throw new WorkspaceAccessDeniedError(
      `Access denied: Current context workspace (${context.workspaceId}) does not match target (${targetWorkspaceId}).`,
    );
  }
}

/**
 * Asserts that the caller's role possesses the required permission code.
 * SuperAdmins bypass permission checks.
 */
export function requirePermission(
  context: BaseWorkspaceContext,
  permission: PermissionCode,
): void {
  if (context.isSuperAdmin) {
    return;
  }

  const hasPerm =
    context.permissions?.includes(permission) ||
    hasPermission(context.role as WorkspaceRole, permission);

  if (!hasPerm) {
    throw new PermissionDeniedError(permission);
  }
}

/**
 * Returns a standardized tenant isolation filter object for database queries.
 */
export function scopedQuery(workspaceId: string) {
  if (!workspaceId) {
    throw new Error('Tenant isolation assertion failed: workspaceId is required.');
  }
  return { workspaceId };
}
