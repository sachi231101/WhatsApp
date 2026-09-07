import crypto from 'crypto';
import Ably from 'ably';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { messageService } from '@/lib/services/messaging/messageService';
import { getAckBotStatus, getAckBotMessage, send } from '@/app/api/beUtils';

export interface ParsedMessageContent {
  type: string;
  body: string;
  caption?: string;
  mediaUrl?: string;
  interactiveData?: any;
}

export interface WebhookRoutingResult {
  status: 'ok' | 'ignored' | 'error';
  processedCount: number;
  eventsLogged: number;
  workspaceIds: string[];
}

export class WebhookRouterService {
  /**
   * Verifies the x-hub-signature-256 HMAC-SHA256 signature using timingSafeEqual.
   */
  verifySignature(rawBody: string, signatureHeader: string | null, appSecret?: string): boolean {
    if (!appSecret) return true;
    if (!signatureHeader) return false;

    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signatureHeader);
    const expectedBuf = Buffer.from(expected);

    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  }

  /**
   * Resolves the target tenant workspace from phone_number_id or waba_id.
   * Falls back gracefully to the default workspace if not found.
   */
  async resolveWorkspace(phoneNumberId?: string, wabaId?: string): Promise<{ workspaceId: string; phoneRecordId?: string }> {
    await ensureCoreTables();

    // 1. Check by phone_number_id
    if (phoneNumberId) {
      const { rows: phoneRows } = await sql`
        SELECT id, workspace_id
        FROM whatsapp_phone_numbers
        WHERE phone_number_id = ${phoneNumberId}
        LIMIT 1
      `;
      if (phoneRows.length > 0) {
        return {
          workspaceId: phoneRows[0].workspace_id,
          phoneRecordId: phoneRows[0].id,
        };
      }
    }

    // 2. Fallback check by waba_id
    if (wabaId) {
      const { rows: accRows } = await sql`
        SELECT workspace_id
        FROM whatsapp_accounts
        WHERE waba_id = ${wabaId}
        LIMIT 1
      `;
      if (accRows.length > 0) {
        return { workspaceId: accRows[0].workspace_id };
      }
    }

    // 3. Fallback to default/first workspace
    const { rows: wsRows } = await sql`SELECT id FROM workspaces LIMIT 1`;
    const defaultWsId = wsRows[0]?.id || '00000000-0000-0000-0000-000000000002';
    return { workspaceId: defaultWsId };
  }

  /**
   * Parses and normalizes incoming message payloads of all types.
   */
  parseMessageContent(msg: any): ParsedMessageContent {
    const type = msg?.type || 'text';

    switch (type) {
      case 'text':
        return {
          type: 'text',
          body: msg?.text?.body || '',
        };

      case 'image':
        return {
          type: 'image',
          body: msg?.image?.caption || '[Photo]',
          caption: msg?.image?.caption,
          mediaUrl: msg?.image?.id,
        };

      case 'video':
        return {
          type: 'video',
          body: msg?.video?.caption || '[Video]',
          caption: msg?.video?.caption,
          mediaUrl: msg?.video?.id,
        };

      case 'audio':
      case 'voice':
        return {
          type: 'audio',
          body: '[Voice Message]',
          mediaUrl: msg?.audio?.id || msg?.voice?.id,
        };

      case 'document':
        return {
          type: 'document',
          body: msg?.document?.filename ? `[Document: ${msg.document.filename}]` : (msg?.document?.caption || '[Document]'),
          caption: msg?.document?.caption,
          mediaUrl: msg?.document?.id,
        };

      case 'sticker':
        return {
          type: 'sticker',
          body: '[Sticker]',
          mediaUrl: msg?.sticker?.id,
        };

      case 'interactive':
        if (msg?.interactive?.type === 'button_reply') {
          const btn = msg.interactive.button_reply;
          return {
            type: 'interactive',
            body: btn?.title || '[Button Reply]',
            interactiveData: btn,
          };
        } else if (msg?.interactive?.type === 'list_reply') {
          const list = msg.interactive.list_reply;
          const bodyText = `${list?.title || ''}${list?.description ? ': ' + list.description : ''}`.trim();
          return {
            type: 'interactive',
            body: bodyText || '[List Reply]',
            interactiveData: list,
          };
        }
        return {
          type: 'interactive',
          body: '[Interactive Reply]',
          interactiveData: msg?.interactive,
        };

      case 'location': {
        const loc = msg?.location;
        const locName = loc?.name ? `${loc.name} (${loc.latitude}, ${loc.longitude})` : `Location: ${loc?.latitude}, ${loc?.longitude}`;
        return {
          type: 'location',
          body: `[${locName}]`,
          interactiveData: loc,
        };
      }

      case 'reaction':
        return {
          type: 'reaction',
          body: `[Reaction: ${msg?.reaction?.emoji || ''}]`,
          interactiveData: msg?.reaction,
        };

      case 'contacts': {
        const contactName = msg?.contacts?.[0]?.name?.formatted_name || 'Contact';
        return {
          type: 'contacts',
          body: `[Contact: ${contactName}]`,
          interactiveData: msg?.contacts,
        };
      }

      default:
        return {
          type,
          body: `[${type} message]`,
        };
    }
  }

  /**
   * Logs an incoming webhook event into the webhook_events table for audit and replay.
   */
  async logWebhookEvent(params: {
    workspaceId?: string;
    eventType: string;
    metaPayload: any;
    processedStatus?: 'processed' | 'failed' | 'ignored';
    errorMessage?: string;
  }) {
    try {
      await ensureCoreTables();
      await sql`
        INSERT INTO webhook_events (
          workspace_id, event_type, meta_payload, processed_status, error_message
        )
        VALUES (
          ${params.workspaceId || null},
          ${params.eventType},
          ${JSON.stringify(params.metaPayload)},
          ${params.processedStatus || 'processed'},
          ${params.errorMessage || null}
        )
      `;
    } catch (err) {
      console.error('[WebhookRouter] Failed to log webhook event:', err);
    }
  }

  /**
   * Main routing entry point: processes an incoming Meta webhook payload,
   * routes events to tenant workspaces, syncs statuses, persists messages,
   * publishes real-time updates via Ably, and retains legacy sample compatibility.
   */
  async processWebhook(
    rawBody: string,
    signatureHeader: string | null,
    options?: { appSecret?: string; ablyKey?: string }
  ): Promise<WebhookRoutingResult> {
    const { appSecret, ablyKey } = options || {};

    // 1. Signature Verification
    if (appSecret) {
      const isValid = this.verifySignature(rawBody, signatureHeader, appSecret);
      if (!isValid) {
        console.warn('[WebhookRouter] Signature mismatch or missing — rejecting payload');
        return { status: 'ignored', processedCount: 0, eventsLogged: 0, workspaceIds: [] };
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('[WebhookRouter] Invalid JSON body:', parseErr);
      return { status: 'error', processedCount: 0, eventsLogged: 0, workspaceIds: [] };
    }

    // 2. Setup Ably realtime client if key available
    let ably: Ably.Realtime | null = null;
    let legacyChannel: any = null;
    if (ablyKey) {
      try {
        ably = new Ably.Realtime({ key: ablyKey, clientId: 'webhook_router' });
        await ably.connection.once('connected');
        legacyChannel = ably.channels.get('get-started');
        // Publish raw data to legacy viewer
        await legacyChannel.publish('first', payload);
      } catch (ablyErr) {
        console.warn('[WebhookRouter] Ably connection failed, proceeding without realtime:', ablyErr);
      }
    }

    const processedWorkspaces = new Set<string>();
    let processedCount = 0;
    let eventsLogged = 0;

    if (payload?.object === 'whatsapp_business_account') {
      for (const entry of payload.entry ?? []) {
        const wabaId = entry.id;

        for (const change of entry.changes ?? []) {
          const value = change.value;
          const field = change.field;
          const phoneNumberId = value?.metadata?.phone_number_id;

          // Resolve tenant workspace
          const { workspaceId } = await this.resolveWorkspace(phoneNumberId, wabaId);
          processedWorkspaces.add(workspaceId);

          // A. Calling Webhooks (connect, terminate, failed, ringing, accepted, completed)
          if (field === 'calls') {
            await this.logWebhookEvent({
              workspaceId,
              eventType: 'calls',
              metaPayload: change,
            });
            eventsLogged++;

            if (ably) {
              const wsCallChannel = ably.channels.get(`workspace:${workspaceId}:calls`);

              if (value?.calls?.length > 0) {
                const call = value.calls[0];
                const callPayload = {
                  type: 'call_event',
                  event: call.event,
                  phoneNumberId,
                  displayPhoneNumber: value?.metadata?.display_phone_number,
                  callerNumber: call.from,
                  wabaId,
                  callId: call.id,
                  sdp: call.session?.sdp,
                  sdpType: call.session?.sdp_type,
                };
                await wsCallChannel.publish('call:event', callPayload);
                if (legacyChannel) await legacyChannel.publish('call', callPayload);
                processedCount++;
              }

              if (value?.statuses?.length > 0) {
                const status = value.statuses[0];
                const statusPayload = {
                  type: 'call_status',
                  status: status.status,
                  phoneNumberId,
                  displayPhoneNumber: value?.metadata?.display_phone_number,
                  wabaId,
                  callId: status.id,
                };
                await wsCallChannel.publish('call:status', statusPayload);
                if (legacyChannel) await legacyChannel.publish('call', statusPayload);
                processedCount++;
              }
            }
          }

          // B. Delivery & Read Statuses (sent, delivered, read, failed)
          if (value?.statuses && Array.isArray(value.statuses)) {
            for (const st of value.statuses) {
              try {
                const errorTitle = st.errors?.[0]?.title || st.errors?.[0]?.message;
                const updatedMsg = await messageService.updateMessageStatus(st.id, st.status, errorTitle);

                const targetWorkspace = updatedMsg?.workspace_id || workspaceId;
                processedWorkspaces.add(targetWorkspace);

                await this.logWebhookEvent({
                  workspaceId: targetWorkspace,
                  eventType: 'statuses',
                  metaPayload: st,
                });
                eventsLogged++;

                if (ably) {
                  const wsInboxChannel = ably.channels.get(`workspace:${targetWorkspace}:inbox`);
                  await wsInboxChannel.publish('message:status', {
                    metaMessageId: st.id,
                    status: st.status,
                    conversationId: updatedMsg?.conversation_id,
                    timestamp: st.timestamp ? Number(st.timestamp) * 1000 : Date.now(),
                    error: st.errors?.[0] || null,
                  });
                }
                processedCount++;
              } catch (stErr) {
                console.warn('[WebhookRouter] Error updating message status:', stErr);
              }
            }
          }

          // C. Phone Number Quality & Name Updates
          if (field === 'phone_number_quality_update' || field === 'phone_number_name_update') {
            try {
              if (phoneNumberId) {
                if (field === 'phone_number_quality_update' && value?.event) {
                  await sql`
                    UPDATE whatsapp_phone_numbers
                    SET quality_rating = ${value.event}, updated_at = CURRENT_TIMESTAMP
                    WHERE phone_number_id = ${phoneNumberId}
                  `;
                } else if (field === 'phone_number_name_update' && value?.verified_name) {
                  await sql`
                    UPDATE whatsapp_phone_numbers
                    SET verified_name = ${value.verified_name}, updated_at = CURRENT_TIMESTAMP
                    WHERE phone_number_id = ${phoneNumberId}
                  `;
                }
              }

              await this.logWebhookEvent({
                workspaceId,
                eventType: field,
                metaPayload: change,
              });
              eventsLogged++;

              if (ably) {
                const wsInboxChannel = ably.channels.get(`workspace:${workspaceId}:inbox`);
                await wsInboxChannel.publish('phone:status', {
                  phoneNumberId,
                  field,
                  data: value,
                });
              }
              processedCount++;
            } catch (propErr) {
              console.warn('[WebhookRouter] Error updating phone property:', propErr);
            }
          }

          // D. Messages (Inbound customer messages of all types)
          if (field === 'messages' || !field) {
            const rawMessages = value?.messages;
            if (Array.isArray(rawMessages) && rawMessages.length > 0 && phoneNumberId) {
              for (const rawMsg of rawMessages) {
                try {
                  const parsed = this.parseMessageContent(rawMsg);
                  const contactName = value?.contacts?.[0]?.profile?.name;

                  const persisted = await messageService.recordInboundMessage({
                    phoneNumberId,
                    wabaId,
                    from: rawMsg.from,
                    contactName,
                    body: parsed.body,
                    caption: parsed.caption,
                    mediaUrl: parsed.mediaUrl,
                    metaMessageId: rawMsg.id,
                    type: parsed.type,
                    timestamp: rawMsg.timestamp ? Number(rawMsg.timestamp) * 1000 : Date.now(),
                  });

                  await this.logWebhookEvent({
                    workspaceId: persisted.workspaceId,
                    eventType: 'messages',
                    metaPayload: rawMsg,
                  });
                  eventsLogged++;

                  // Real-time broadcast to tenant workspace channel
                  if (ably && persisted?.workspaceId) {
                    const wsChannel = ably.channels.get(`workspace:${persisted.workspaceId}:inbox`);
                    await wsChannel.publish('message:new', {
                      conversationId: persisted.conversationId,
                      message: persisted.message,
                      contact: persisted.contact,
                    });
                  }

                  // Legacy AckBot execution
                  if (rawMsg?.type === 'text' && rawMsg?.text && phoneNumberId) {
                    const { rows }: { rows: { access_token: string }[] } =
                      await sql`SELECT access_token FROM wabas WHERE waba_id = ${wabaId}`;
                    const accessToken = rows[0]?.access_token;

                    if (accessToken) {
                      const recipient: string = rawMsg.from;
                      const msgBody: string = rawMsg.text.body;

                      const isAckBotEnabled = await getAckBotStatus(phoneNumberId);
                      if (isAckBotEnabled) {
                        const customMessage = await getAckBotMessage(phoneNumberId);
                        const ackText = customMessage || 'ack: ' + msgBody;

                        await send(phoneNumberId, accessToken, recipient, ackText);

                        const ackTimestamp = Date.now();
                        const ackPayload = {
                          object: 'whatsapp_business_account',
                          entry: [
                            {
                              id: wabaId,
                              changes: [
                                {
                                  value: {
                                    messaging_product: 'whatsapp',
                                    metadata: { phone_number_id: phoneNumberId },
                                    messages: [
                                      {
                                        from: '_ackbot_',
                                        type: 'text',
                                        text: { body: ackText },
                                        timestamp: Math.floor(ackTimestamp / 1000),
                                        _ackbot_recipient: recipient,
                                      },
                                    ],
                                  },
                                  field: 'messages',
                                },
                              ],
                            },
                          ],
                        };

                        if (legacyChannel) {
                          await legacyChannel.publish('first', ackPayload);
                        }
                      }
                    }
                  }

                  processedCount++;
                } catch (msgErr) {
                  console.error('[WebhookRouter] Inbound message processing error:', msgErr);
                  await this.logWebhookEvent({
                    workspaceId,
                    eventType: 'messages',
                    metaPayload: rawMsg,
                    processedStatus: 'failed',
                    errorMessage: msgErr instanceof Error ? msgErr.message : String(msgErr),
                  });
                }
              }
            }
          }
        }
      }
    }

    if (ably) {
      try {
        ably.close();
      } catch {
        // ignore close errors
      }
    }

    return {
      status: 'ok',
      processedCount,
      eventsLogged,
      workspaceIds: Array.from(processedWorkspaces),
    };
  }
}

export const webhookRouterService = new WebhookRouterService();
