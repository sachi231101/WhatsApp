// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Auth0Client } from '@auth0/nextjs-auth0/server';

const _auth0 = new Auth0Client();

export const auth0 = {
  ..._auth0,
  getSession: async () => {
    // 1. Prioritize encrypted session cookie (Admin or Client)
    try {
      const { getSessionUser } = await import('@/lib/auth/session');
      const customUser = await getSessionUser();
      if (customUser) {
        return {
          user: {
            email: customUser.email,
            name: customUser.name,
            sub: customUser.userId,
            role: customUser.role,
            isSuperAdmin: customUser.isSuperAdmin,
            tenantId: customUser.tenantId,
            workspaceId: customUser.workspaceId,
          },
        } as any;
      }
    } catch {
      // getSessionUser not available in current environment
    }

    // In production, bypass is strictly prohibited and only authentic Auth0 session is allowed
    if (process.env.NODE_ENV === 'production') {
      try {
        return await _auth0.getSession();
      } catch {
        return null;
      }
    }

    // 2. In non-production, check Auth0 session if bypass is not explicitly enabled
    if (process.env.BYPASS_AUTH !== 'true') {
      try {
        return await _auth0.getSession();
      } catch {
        return null;
      }
    }

    return null;
  },
  middleware: _auth0.middleware.bind(_auth0),
};
