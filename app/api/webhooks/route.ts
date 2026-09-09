// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import privateConfig from '@/app/privateConfig';
import { sql } from '@/lib/db';
import { webhookRouterService } from '@/lib/services/whatsapp/webhookRouter';
import { enqueueWebhookEvent } from '@/lib/queue/webhookQueue';
import { extractMetaIdentifiers } from '@/lib/queue/webhookWorker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/webhooks
 * Meta Webhook verification handshake.
 * Returns challenge if verify token matches, 403 Forbidden otherwise.
 */
export async function GET(request: NextRequest) {
  const { fbVerifyToken } = await privateConfig();
  const mode = request.nextUrl.searchParams.get('hub.mode') || '';
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token') || '';
  const challenge = request.nextUrl.searchParams.get('hub.challenge') || '';

  if (mode === 'subscribe' && verifyToken && verifyToken === fbVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

/**
 * POST /api/webhooks
 * Meta Webhook event receiver.
 * 1. Verifies HMAC-SHA256 signature
 * 2. Checks idempotency
 * 3. Persists raw event into webhook_events
 * 4. Dispatches BullMQ job to queue
 * 5. Responds HTTP 200 immediately (no slow synchronous work)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const { fbAppSecret } = await privateConfig();

    // 1. Signature Verification
    if (fbAppSecret) {
      const isValid = webhookRouterService.verifySignature(rawBody, signature, fbAppSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 2. Extract external identifier & compute deterministic idempotency hash
    const { wabaId } = extractMetaIdentifiers(parsedBody);
    const entry = Array.isArray(parsedBody?.entry) ? parsedBody.entry[0] : null;
    const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;
    const changeVal = change?.value;
    const messageId = changeVal?.messages?.[0]?.id;
    const statusId = changeVal?.statuses?.[0]?.id;
    const externalEventId: string | undefined = messageId || statusId;

    const idempotencyHash = crypto
      .createHash('sha256')
      .update(externalEventId ? `${wabaId || ''}:${externalEventId}` : rawBody)
      .digest('hex');

    // 3. Idempotency Check: check if event with this hash was already received
    const { rows: existingRows } = await sql`
      SELECT id, status FROM webhook_events
      WHERE idempotency_hash = ${idempotencyHash}
      LIMIT 1
    `;

    if (existingRows.length > 0) {
      // Duplicate event detected: acknowledge immediately without re-enqueuing
      return NextResponse.json({
        status: 'ok',
        deduplicated: true,
        eventId: existingRows[0].id,
      });
    }

    // 4. Persist raw event immediately into webhook_events
    const eventType = change?.field || parsedBody?.object || 'messages';
    const { rows: insertedRows } = await sql`
      INSERT INTO webhook_events (
        provider, event_type, external_event_id, idempotency_hash,
        meta_waba_id, field, payload, signature_verified,
        status, processing_status, attempts, retry_count,
        received_at, created_at, updated_at
      )
      VALUES (
        'meta_whatsapp', ${eventType}, ${externalEventId || null}, ${idempotencyHash},
        ${wabaId || null}, ${change?.field || 'messages'}, ${JSON.stringify(parsedBody)}, true,
        'pending', 'pending', 0, 0,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (idempotency_hash) DO NOTHING
      RETURNING id
    `;

    const eventId = insertedRows[0]?.id;

    // 5. Enqueue BullMQ job for asynchronous worker processing
    if (eventId) {
      await enqueueWebhookEvent({
        webhookEventId: eventId,
        externalEventId,
        payload: parsedBody,
        receivedAt: new Date().toISOString(),
      });
    }

    // 6. Return HTTP 200 immediately
    return NextResponse.json({
      status: 'ok',
      eventId: eventId || 'deduplicated',
      enqueued: Boolean(eventId),
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Webhook] Unhandled webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
