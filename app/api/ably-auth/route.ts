// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { NextResponse } from 'next/server';

import Ably from 'ably';

import { withAuth } from '@/app/api/authWrapper';
import getPrivateConfig from '@/app/privateConfig';

export const dynamic = 'force-dynamic';

function isValidAblyKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  // Ably API key format is "appId.keyId:keySecret" (must contain a colon)
  // and cannot be a JWT (starts with eyJ) or default placeholder
  return key.includes(':') && !key.startsWith('eyJ') && key !== 'your-ably-api-key';
}

let hasLoggedAblyWarning = false;

async function createTokenRequest(clientId: string, ablyKey: string) {
  const ably = new Ably.Realtime(ablyKey);
  try {
    const r = await ably.auth.createTokenRequest(
      {
        ttl: 3600000,
        clientId: clientId,
      },
      {
        key: ablyKey,
      },
    );
    return r;
  } finally {
    ably.close();
  }
}

export const GET = withAuth(async function createAblyToken(_, session) {
  try {
    const { ablyKey } = await getPrivateConfig();

    if (!isValidAblyKey(ablyKey)) {
      if (!hasLoggedAblyWarning) {
        console.warn(
          '[Ably] ABLY_KEY is missing or not a valid API key (format: "appId.keyId:keySecret"). Real-time messaging will be disabled. (Note: A JWT/control token cannot be used as an API key).',
        );
        hasLoggedAblyWarning = true;
      }
      return NextResponse.json(
        {
          enabled: false,
          configured: false,
          error:
            'ABLY_KEY is missing or invalid. Realtime updates are disabled. Expected format: appId.keyId:keySecret',
        },
        { status: 200 },
      );
    }

    const clientId = session.user.email;
    const tokenRequest = await createTokenRequest(clientId, ablyKey!);
    return NextResponse.json({
      enabled: true,
      ...tokenRequest,
    });
  } catch (error) {
    console.error('Failed to create Ably token:', (error as Error)?.message || error);
    return NextResponse.json({ enabled: false, error: 'Failed to create Ably token' }, { status: 500 });
  }
});
