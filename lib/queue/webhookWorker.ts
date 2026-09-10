import { Worker, type Job } from 'bullmq';
import { sql } from '@/lib/db';
import { getRedisOptions } from './redis';
import { WEBHOOK_QUEUE_NAME, type WebhookJobData } from './webhookQueue';

export interface WebhookProcessResult {
  success: boolean;
  webhookEventId: string;
  projectId?: string;
  workspaceId?: string;
  status: 'processed' | 'ignored' | 'failed';
  error?: string;
}

/**
 * Extracts phone_number_id and waba_id from a Meta webhook payload.
 */
export function extractMetaIdentifiers(payload: any): { phoneNumberId?: string; wabaId?: string } {
  if (!payload || typeof payload !== 'object') return {};

  const entry = Array.isArray(payload.entry) ? payload.entry[0] : null;
  const wabaId = entry?.id ? String(entry.id) : undefined;

  const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;
  const metadata = change?.value?.metadata;
  const phoneNumberId = metadata?.phone_number_id ? String(metadata.phone_number_id) : undefined;

  return { phoneNumberId, wabaId };
}

/**
 * Core asynchronous processing logic for an enqueued webhook event.
 * Identifies the associated project and workspace, marks the event as processed,
 * and sets the foundation for future message processing.
 */
export async function processWebhookJob(data: WebhookJobData): Promise<WebhookProcessResult> {
  const { webhookEventId, payload } = data;

  try {
    const { phoneNumberId, wabaId } = extractMetaIdentifiers(payload);

    let projectId: string | undefined;
    let workspaceId: string | undefined;

    // 1. First priority: match by phone_number_id in whatsapp_connections
    if (phoneNumberId) {
      const { rows: phoneConnRows } = await sql`
        SELECT project_id, workspace_id
        FROM whatsapp_connections
        WHERE phone_number_id = ${phoneNumberId} AND status = 'CONNECTED'
        LIMIT 1
      `;
      if (phoneConnRows.length > 0) {
        projectId = phoneConnRows[0].project_id;
        workspaceId = phoneConnRows[0].workspace_id;
      }
    }

    // 2. Second priority: match by waba_id in whatsapp_connections
    if (!projectId && wabaId) {
      const { rows: wabaConnRows } = await sql`
        SELECT project_id, workspace_id
        FROM whatsapp_connections
        WHERE waba_id = ${wabaId} AND status = 'CONNECTED'
        LIMIT 1
      `;
      if (wabaConnRows.length > 0) {
        projectId = wabaConnRows[0].project_id;
        workspaceId = wabaConnRows[0].workspace_id;
      }
    }

    // 3. Update the webhook_events record with resolved project & workspace
    const finalStatus = projectId ? 'processed' : 'ignored';

    await sql`
      UPDATE webhook_events
      SET 
        project_id = ${projectId || null},
        workspace_id = ${workspaceId || null},
        status = ${finalStatus},
        processing_status = ${finalStatus},
        processed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${webhookEventId}
    `;

    // 4. Inbound Message Processing & Realtime Fan-out (Step 5)
    if (projectId && workspaceId) {
      const entry = Array.isArray(payload.entry) ? payload.entry[0] : null;
      const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;
      const value = change?.value;

      // A. Process Inbound Messages
      if (value?.messages && Array.isArray(value.messages)) {
        for (const rawMsg of value.messages) {
          try {
            const metaMsgId = String(rawMsg.id);

            // Inbound Idempotency: Skip if message with meta_message_id already exists
            const { rows: existingMsgRows } = await sql`
              SELECT id FROM messages WHERE meta_message_id = ${metaMsgId} LIMIT 1
            `;
            if (existingMsgRows.length > 0) {
              continue;
            }

            const senderWaId = String(rawMsg.from);
            const contactName = value?.contacts?.[0]?.profile?.name || senderWaId;

            // Step 6: Inbound WhatsApp identity deduplication & auto-creation
            const { contactService } = await import('@/lib/services/contacts');
            const contact = await contactService.findOrCreateWhatsAppContact({
              workspaceId,
              projectId,
              waId: senderWaId,
              profileName: contactName,
            });
            const contactId = contact.id;
            const contactCompat = {
              ...contact,
              profile_name: contact.displayName,
              phone_number: contact.phoneNumber,
            };

            // Calculate 24hr customer service window
            const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const preview = rawMsg.text?.body || (rawMsg.type ? `[${rawMsg.type}]` : '[Message]');

            // Find or create Conversation scoped by project_id and workspace_id
            let convId: string;
            let conversationHandlingMode = 'AI_HANDLING';
            const { rows: existingConvRows } = await sql`
              SELECT id, status, unread_count, handling_mode
              FROM conversations
              WHERE workspace_id = ${workspaceId} AND project_id = ${projectId} AND contact_id = ${contactId}
              LIMIT 1
            `;

            if (existingConvRows.length > 0) {
              convId = existingConvRows[0].id;
              conversationHandlingMode = existingConvRows[0].handling_mode || 'AI_HANDLING';
              await sql`
                UPDATE conversations
                SET 
                  last_message_preview = ${preview.slice(0, 100)},
                  last_message_at = CURRENT_TIMESTAMP,
                  unread_count = unread_count + 1,
                  window_expires_at = ${windowExpiresAt},
                  status = CASE WHEN status = 'resolved' OR status = 'closed' THEN 'open' ELSE status END,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ${convId}
              `;
            } else {
              const { rows: newConvRows } = await sql`
                INSERT INTO conversations (
                  workspace_id, project_id, contact_id, status, handling_mode,
                  last_message_preview, last_message_at, unread_count, window_expires_at
                )
                VALUES (
                  ${workspaceId}, ${projectId}, ${contactId}, 'open', 'AI_HANDLING',
                  ${preview.slice(0, 100)}, CURRENT_TIMESTAMP, 1, ${windowExpiresAt}
                )
                RETURNING id, handling_mode
              `;
              convId = newConvRows[0]?.id;
              conversationHandlingMode = newConvRows[0]?.handling_mode || 'AI_HANDLING';

              // Publish Domain Event for conversation.created (Phase 10 Trigger Engine)
              const { publishDomainEvent } = await import('@/lib/events/domainEvent');
              await publishDomainEvent({
                id: `conv-created-${convId}`,
                type: 'conversation.created',
                workspaceId,
                projectId,
                occurredAt: new Date().toISOString(),
                payload: {
                  conversationId: convId,
                  contactId,
                  channel: 'WHATSAPP',
                },
                metadata: { source: 'meta' },
              });
            }

            // Insert Inbound Message
            const { rows: msgRows } = await sql`
              INSERT INTO messages (
                workspace_id, project_id, conversation_id, meta_message_id, external_message_id,
                direction, sender_type, type, body, status, created_at
              )
              VALUES (
                ${workspaceId}, ${projectId}, ${convId}, ${metaMsgId}, ${metaMsgId},
                'inbound', 'customer', ${rawMsg.type || 'text'}, ${rawMsg.text?.body || preview}, 'delivered',
                CURRENT_TIMESTAMP
              )
              ON CONFLICT (meta_message_id) DO NOTHING
              RETURNING id, meta_message_id, body, type, status, created_at
            `;

            const insertedMsg = msgRows[0];

            // Publish Ably Realtime Event
            const { publishInboxEvent } = await import('@/lib/realtime/ablyPublisher');
            await publishInboxEvent({
              workspaceId,
              projectId,
              event: 'message.created',
              data: {
                conversationId: convId,
                message: insertedMsg,
                contact: contactCompat,
              },
            });

            // Publish Domain Event for message.created (Phase 10 Trigger Engine)
            if (insertedMsg?.id) {
              const { publishDomainEvent } = await import('@/lib/events/domainEvent');
              const isNewContact = Boolean(
                (contact as any).isNew ||
                (contact.createdAt && Date.now() - new Date(contact.createdAt).getTime() < 10000)
              );
              await publishDomainEvent({
                id: `msg-${insertedMsg.id}`,
                type: 'message.created',
                workspaceId,
                projectId,
                occurredAt: new Date().toISOString(),
                payload: {
                  messageId: insertedMsg.id,
                  metaMessageId: metaMsgId,
                  conversationId: convId,
                  contactId,
                  phoneNumberId,
                  phoneNumber: senderWaId,
                  type: rawMsg.type || 'text',
                  body: rawMsg.text?.body || preview,
                  direction: 'inbound',
                  senderType: 'customer',
                  isNewContact,
                },
                metadata: { source: 'meta' },
              });
            }

            // Step 6: Record MESSAGE_RECEIVED activity for contact timeline
            await sql`
              INSERT INTO contact_activities (
                workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
              )
              VALUES (
                ${workspaceId}, ${projectId}, ${contactId}, 'MESSAGE_RECEIVED',
                NULL, ${contact.displayName || 'Customer'},
                ${`Received message: "${preview.slice(0, 60)}${preview.length > 60 ? '...' : ''}"`},
                ${JSON.stringify({ messageId: insertedMsg?.id, metaMessageId: metaMsgId, conversationId: convId })}
              )
            `;

            await publishInboxEvent({
              workspaceId,
              projectId,
              event: 'conversation.updated',
              data: {
                conversationId: convId,
                lastMessagePreview: preview.slice(0, 100),
                status: 'open',
              },
            });

            // Step 7: Enqueue AI processing job if handling mode allows it (AI_HANDLING or HYBRID)
            if (conversationHandlingMode !== 'HUMAN_HANDLING' && insertedMsg?.id) {
              const { enqueueAiMessage } = await import('@/lib/queue/aiMessageQueue');
              await enqueueAiMessage({
                workspaceId,
                projectId,
                conversationId: convId,
                messageId: insertedMsg.id,
                messageBody: rawMsg.text?.body || preview,
                contactId,
                destPhone: senderWaId,
              });
            }
          } catch (msgErr) {
            console.error('[WebhookWorker] Error processing inbound message:', msgErr);
          }
        }
      }

      // B. Process Message Status Receipts (sent, delivered, read, failed)
      if (value?.statuses && Array.isArray(value.statuses)) {
        for (const st of value.statuses) {
          try {
            const stMetaId = String(st.id);
            const newStatus = String(st.status); // 'sent' | 'delivered' | 'read' | 'failed'
            const errorMsg = st.errors?.[0]?.message || st.errors?.[0]?.title || null;

            const { rows: updatedRows } = await sql`
              UPDATE messages
              SET 
                status = ${newStatus},
                delivered_at = CASE WHEN ${newStatus} = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
                read_at = CASE WHEN ${newStatus} = 'read' THEN CURRENT_TIMESTAMP ELSE read_at END,
                error_message = COALESCE(${errorMsg}, error_message)
              WHERE meta_message_id = ${stMetaId}
              RETURNING id, conversation_id
            `;

            if (updatedRows.length > 0) {
              const updated = updatedRows[0];
              await sql`
                INSERT INTO message_status_events (
                  workspace_id, message_id, meta_message_id, status, timestamp, raw_event
                )
                VALUES (
                  ${workspaceId}, ${updated.id}, ${stMetaId}, ${newStatus}, CURRENT_TIMESTAMP, ${JSON.stringify(st)}
                )
              `;

              const { publishInboxEvent } = await import('@/lib/realtime/ablyPublisher');
              await publishInboxEvent({
                workspaceId,
                projectId,
                event: 'message.status.updated',
                data: {
                  messageId: updated.id,
                  conversationId: updated.conversation_id,
                  status: newStatus,
                  metaMessageId: stMetaId,
                  error: errorMsg,
                },
              });
            }
          } catch (stErr) {
            console.error('[WebhookWorker] Error processing status receipt:', stErr);
          }
        }
      }
    }

    return {
      success: true,
      webhookEventId,
      projectId,
      workspaceId,
      status: finalStatus,
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown processing error';
    console.error(`[WebhookWorker] Failed to process webhook ${webhookEventId}:`, err);

    try {
      await sql`
        UPDATE webhook_events
        SET 
          status = 'failed',
          processing_status = 'failed',
          attempts = attempts + 1,
          retry_count = retry_count + 1,
          error = ${errorMessage},
          error_message = ${errorMessage},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${webhookEventId}
      `;
    } catch (dbErr) {
      console.error('[WebhookWorker] Could not record failure status to DB:', dbErr);
    }

    return {
      success: false,
      webhookEventId,
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Initializes and starts the BullMQ Worker process.
 */
export function createWebhookWorker(): Worker<WebhookJobData> | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const worker = new Worker<WebhookJobData>(
      WEBHOOK_QUEUE_NAME,
      async (job: Job<WebhookJobData>) => {
        return await processWebhookJob(job.data);
      },
      {
        connection: getRedisOptions(),
        concurrency: 5,
      },
    );

    worker.on('failed', (job, err) => {
      console.error(`[WebhookWorker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
  } catch (err) {
    console.warn('[WebhookWorker] Could not start BullMQ worker:', err);
    return null;
  }
}
