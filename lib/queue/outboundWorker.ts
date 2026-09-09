import { Worker, type Job } from 'bullmq';
import { sql } from '@/lib/db';
import { getRedisOptions } from './redis';
import { OUTBOUND_QUEUE_NAME, type OutboundJobData } from './outboundQueue';
import { decrypt } from '@/lib/crypto/encryption';
import { metaGraphClient } from '@/lib/meta/graphClient';
import { publishInboxEvent } from '@/lib/realtime/ablyPublisher';
import { isMockMode } from '@/app/api/mockData';

export interface OutboundProcessResult {
  success: boolean;
  messageId: string;
  metaMessageId?: string;
  status: 'sent' | 'failed';
  error?: string;
}

/**
 * Processes an outbound message job:
 * 1. Resolves WhatsApp connection and decrypts access token
 * 2. Calls Meta Graph API to send the message
 * 3. Persists Meta message ID and updates message status to 'sent'
 * 4. Dispatches real-time update to Ably
 */
export async function processOutboundJob(data: OutboundJobData): Promise<OutboundProcessResult> {
  const {
    messageId,
    workspaceId,
    projectId,
    conversationId,
    destPhone,
    body,
    type = 'text',
    replyToMetaId,
  } = data;

  try {
    // 1. Fetch connection details for the project
    const { rows: connRows } = await sql`
      SELECT 
        phone_number_id, encrypted_access_token, token_iv, token_tag, status
      FROM whatsapp_connections
      WHERE project_id = ${projectId} AND status = 'CONNECTED'
      LIMIT 1
    `;

    if (connRows.length === 0) {
      const error = 'No active WhatsApp connection found for project';
      await sql`
        UPDATE messages
        SET status = 'failed', error_message = ${error}
        WHERE id = ${messageId}
      `;
      await publishInboxEvent({
        workspaceId,
        projectId,
        event: 'message.status.updated',
        data: { messageId, conversationId, status: 'failed', error },
      });
      return { success: false, messageId, status: 'failed', error };
    }

    const conn = connRows[0];
    const phoneNumberId = conn.phone_number_id;
    const accessToken = decrypt({
      ciphertext: conn.encrypted_access_token,
      iv: conn.token_iv,
      tag: conn.token_tag,
    });

    // 2. Dispatch to Meta Graph API
    let metaMessageId = `wamid.HBgL${Date.now()}`;

    if (isMockMode()) {
      metaMessageId = `wamid.MOCK_OUTBOUND_${Date.now()}`;
    } else {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: destPhone.replace(/[^0-9]/g, ''),
        type: type === 'template' ? 'template' : 'text',
      };

      if (type === 'template') {
        payload.template = { name: body, language: { code: 'en_US' } };
      } else {
        payload.text = { body };
      }

      if (replyToMetaId) {
        payload.context = { message_id: replyToMetaId };
      }

      const metaRes = await metaGraphClient.post(
        `/${phoneNumberId}/messages`,
        accessToken,
        payload,
      );

      if (metaRes?.messages?.[0]?.id) {
        metaMessageId = metaRes.messages[0].id;
      }
    }

    // 3. Update message record to 'sent' and save provider ID
    await sql`
      UPDATE messages
      SET 
        status = 'sent',
        meta_message_id = ${metaMessageId},
        external_message_id = ${metaMessageId},
        sent_at = CURRENT_TIMESTAMP
      WHERE id = ${messageId}
    `;

    // 4. Record status event
    await sql`
      INSERT INTO message_status_events (
        workspace_id, message_id, meta_message_id, status, timestamp, raw_event
      )
      VALUES (
        ${workspaceId}, ${messageId}, ${metaMessageId}, 'sent', CURRENT_TIMESTAMP, '{}'
      )
    `;

    // 5. Update conversation preview
    await sql`
      UPDATE conversations
      SET 
        last_message_preview = ${body.slice(0, 100)},
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId}
    `;

    // 6. Broadcast to tenant-scoped Ably channel
    await publishInboxEvent({
      workspaceId,
      projectId,
      event: 'message.status.updated',
      data: {
        messageId,
        conversationId,
        status: 'sent',
        metaMessageId,
      },
    });

    return {
      success: true,
      messageId,
      metaMessageId,
      status: 'sent',
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to dispatch message to Meta';
    console.error(`[OutboundWorker] Error sending message ${messageId}:`, err);

    try {
      await sql`
        UPDATE messages
        SET status = 'failed', error_message = ${errorMsg}
        WHERE id = ${messageId}
      `;
      await sql`
        INSERT INTO message_status_events (
          workspace_id, message_id, meta_message_id, status, timestamp, raw_event
        )
        VALUES (
          ${workspaceId}, ${messageId}, ${'failed_' + messageId}, 'failed', CURRENT_TIMESTAMP, ${JSON.stringify({ error: errorMsg })}
        )
      `;
      await publishInboxEvent({
        workspaceId,
        projectId,
        event: 'message.status.updated',
        data: {
          messageId,
          conversationId,
          status: 'failed',
          error: errorMsg,
        },
      });
    } catch (dbErr) {
      console.error('[OutboundWorker] DB update failed after send error:', dbErr);
    }

    return {
      success: false,
      messageId,
      status: 'failed',
      error: errorMsg,
    };
  }
}

/**
 * Initializes and starts the BullMQ Outbound Worker process.
 */
export function createOutboundWorker(): Worker<OutboundJobData> | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const worker = new Worker<OutboundJobData>(
      OUTBOUND_QUEUE_NAME,
      async (job: Job<OutboundJobData>) => {
        return await processOutboundJob(job.data);
      },
      {
        connection: getRedisOptions(),
        concurrency: 5,
      },
    );

    worker.on('failed', (job, err) => {
      console.error(`[OutboundWorker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
  } catch (err) {
    console.warn('[OutboundWorker] Failed to initialize worker:', err);
    return null;
  }
}
