// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { NextResponse, type NextRequest } from 'next/server';
import privateConfig from '@/app/privateConfig';
import { webhookRouterService } from '@/lib/services/whatsapp/webhookRouter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { fbVerifyToken } = await privateConfig();
  const mode = request.nextUrl.searchParams.get('hub.mode') || '';
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token') || '';
  const challenge = request.nextUrl.searchParams.get('hub.challenge') || '';

  if (mode === 'subscribe' && verifyToken === fbVerifyToken) {
    return new NextResponse(challenge);
  } else {
    return NextResponse.json({ status: 'ok' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const { fbAppSecret, ablyKey } = await privateConfig();

    const result = await webhookRouterService.processWebhook(rawBody, signature, {
      appSecret: fbAppSecret,
      ablyKey,
    });

    if (result.status === 'ignored') {
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ok', processed: result.processedCount });
  } catch (error) {
    console.error('[Webhook] Unhandled webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
