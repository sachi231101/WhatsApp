// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { type NextRequest, NextResponse } from 'next/server';

import { auth0 } from '@/lib/auth0';
import { resolveWorkspaceContext, type WorkspaceContext } from '@/lib/auth/context';
import { hasRoleAtLeast, type WorkspaceRole } from '@/lib/auth/roles';
import { type PermissionCode } from '@/lib/auth/permissions';

export interface AuthSession {
  user: {
    email?: string;
    name?: string;
    sub?: string;
  };
  workspace: WorkspaceContext;
}

export type ApiHandler = (request: NextRequest, session: AuthSession) => Promise<NextResponse> | NextResponse;

/**
 * Enhanced authentication wrapper that extracts workspace context dynamically
 * from the 'x-workspace-id' header or 'wazzapp_workspace_id' cookie.
 */
export function withAuth(handler: ApiHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await auth0.getSession();

      if (!session || !session.user || !session.user.email) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 },
        );
      }

      // Check request header or cookie for explicit workspace selection
      const requestedWorkspaceId =
        request.headers.get('x-workspace-id') ||
        request.cookies.get('wazzapp_workspace_id')?.value ||
        undefined;

      const workspace = await resolveWorkspaceContext(
        session.user.email,
        session.user.name,
        requestedWorkspaceId,
      );

      const enhancedSession: AuthSession = {
        user: session.user,
        workspace,
      };

      return await handler(request, enhancedSession);
    } catch (error) {
      console.error('Auth wrapper error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication failed' },
        { status: 500 },
      );
    }
  };
}

/**
 * Route protection wrapper requiring a specific permission code.
 */
export function withPermission(permission: PermissionCode, handler: ApiHandler) {
  return withAuth(async (request, session) => {
    if (session.workspace.isSuperAdmin) {
      return handler(request, session);
    }

    const hasPerm = session.workspace.permissions.includes(permission);
    if (!hasPerm) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `Action requires '${permission}' permission.`,
          code: 'PERMISSION_DENIED',
        },
        { status: 403 },
      );
    }

    return handler(request, session);
  });
}

/**
 * Route protection wrapper requiring a minimum workspace role level.
 */
export function withRole(minRole: WorkspaceRole, handler: ApiHandler) {
  return withAuth(async (request, session) => {
    if (session.workspace.isSuperAdmin) {
      return handler(request, session);
    }

    const authorized = hasRoleAtLeast(session.workspace.role, minRole);
    if (!authorized) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `Action requires role '${minRole}' or higher.`,
          code: 'ROLE_REQUIRED',
        },
        { status: 403 },
      );
    }

    return handler(request, session);
  });
}
