import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, AuthenticationRequiredError, type UserRecord } from '@/lib/auth/user';
import { requireProjectAccess, ProjectNotFoundError, type ProjectAccessContext } from '@/lib/projects/project-access';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES, type WorkspaceRole } from '@/lib/auth/roles';
import {
  AutomationNotFoundError,
  AutomationVersionNotFoundError,
  AutomationVersionImmutableError,
  AutomationTenantViolationError,
  AutomationNodeDuplicateKeyError,
  AutomationEdgeInvalidNodeError,
  AutomationIdempotencyConflictError,
  AutomationDuplicateNameError,
  AutomationRecord,
} from './types';
import { automationDomainService } from './automationDomainService';
import { ValidationError, validateUuid } from './validation';

export interface AuthorizedAutomationContext {
  user: UserRecord;
  workspace: ProjectAccessContext['workspace'];
  project: ProjectAccessContext['project'];
  membership: ProjectAccessContext['membership'];
  automation?: AutomationRecord;
}

/**
 * Validates authentication, workspace membership, project access, and role permissions.
 * If automationId is supplied, strictly validates that the automation belongs to this workspace and project.
 */
export async function authorizeAutomationAccess(params: {
  projectId: string;
  minRole?: WorkspaceRole;
  automationId?: string;
}): Promise<AuthorizedAutomationContext> {
  const { projectId, minRole = WORKSPACE_ROLES.VIEWER, automationId } = params;

  if (automationId) {
    validateUuid(automationId, 'Automation ID');
  }

  // 1. Authentication
  const user = await requireAuthenticatedUser();

  // 2. Project & Workspace access with role hierarchy check
  const { project, workspace, membership } = await requireProjectAccess(projectId, minRole, user.id);

  // 4. If automationId provided, verify tenant ownership
  let automation: AutomationRecord | undefined;
  if (automationId) {
    automation = await automationDomainService.getAutomation(workspace.id, projectId, automationId);
  }

  return {
    user,
    workspace,
    project,
    membership,
    automation,
  };
}

/**
 * Maps domain and security errors to safe HTTP responses without exposing internal stack traces.
 */
export function handleApiError(err: any): NextResponse {
  // Authentication
  if (err instanceof AuthenticationRequiredError) {
    return NextResponse.json(
      { status: 'error', error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Role permissions
  if (err instanceof RoleAuthorizationError) {
    return NextResponse.json(
      { status: 'error', error: 'Forbidden: Insufficient permissions for this action' },
      { status: 403 }
    );
  }

  // Tenant violations
  if (err instanceof AutomationTenantViolationError) {
    return NextResponse.json(
      { status: 'error', error: 'Access denied: Automation does not belong to authorized workspace or project' },
      { status: 403 }
    );
  }

  // Not Found errors
  if (err instanceof ProjectNotFoundError) {
    return NextResponse.json(
      { status: 'error', error: 'Project not found' },
      { status: 404 }
    );
  }
  if (err instanceof AutomationNotFoundError) {
    return NextResponse.json(
      { status: 'error', error: 'Automation not found' },
      { status: 404 }
    );
  }
  if (err instanceof AutomationVersionNotFoundError) {
    return NextResponse.json(
      { status: 'error', error: 'Automation version not found' },
      { status: 404 }
    );
  }

  // Validation errors
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { status: 'error', error: err.message, details: err.details },
      { status: 400 }
    );
  }
  if (err instanceof AutomationVersionImmutableError) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 400 }
    );
  }
  if (err instanceof AutomationEdgeInvalidNodeError) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 400 }
    );
  }

  // Conflicts
  if (err instanceof AutomationNodeDuplicateKeyError) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 409 }
    );
  }
  if (err instanceof AutomationIdempotencyConflictError) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 409 }
    );
  }
  if (err instanceof AutomationDuplicateNameError) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 409 }
    );
  }

  // Generic internal server error (never exposes stack traces)
  console.error('[Automation API Error]:', err?.message || err);
  return NextResponse.json(
    { status: 'error', error: 'An unexpected internal error occurred' },
    { status: 500 }
  );
}
