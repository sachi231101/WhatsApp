// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getSessionUser } from '@/lib/auth/session';

const _auth0 = new Auth0Client();

export const auth0 = {
  ..._auth0,
  getSession: async () => {
    // 1. Prioritize encrypted session cookie (Admin or Client)
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

    // 2. If Auth0 is active and not bypassed, check Auth0 session
    if (process.env.BYPASS_AUTH !== 'true' || process.env.NODE_ENV !== 'development') {
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
