import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const { mockSql, mockPublish, mockChannel, mockChannelsGet } = vi.hoisted(() => {
  const sqlFn: any = vi.fn();
  sqlFn.query = vi.fn().mockResolvedValue({ rows: [] });
  const publishFn = vi.fn().mockResolvedValue({});
  const channelObj = {
    publish: publishFn,
    subscribe: vi.fn(),
  };
  const channelsGetFn = vi.fn().mockReturnValue(channelObj);

  return {
    mockSql: sqlFn,
    mockPublish: publishFn,
    mockChannel: channelObj,
    mockChannelsGet: channelsGetFn,
  };
});

vi.mock('@/lib/db', () => ({
  sql: Object.assign((...args: any[]) => mockSql(...args), {
    query: (...args: any[]) => mockSql.query(...args),
  }),
}));

vi.mock('@vercel/postgres', () => ({
  sql: Object.assign((...args: any[]) => mockSql(...args), {
    query: (...args: any[]) => mockSql.query(...args),
  }),
}));

vi.mock('ably', () => {
  class MockRealtime {
    connection = { once: vi.fn().mockResolvedValue({}) };
    channels = { get: mockChannelsGet };
    close = vi.fn();
  }
  return {
    default: {
      Realtime: MockRealtime,
    },
  };
});

// Mock messageService
const mockRecordInboundMessage = vi.fn();
const mockUpdateMessageStatus = vi.fn();
vi.mock('@/lib/services/messaging/messageService', () => ({
  messageService: {
    recordInboundMessage: (...args: any[]) => mockRecordInboundMessage(...args),
    updateMessageStatus: (...args: any[]) => mockUpdateMessageStatus(...args),
  },
}));

// Mock beUtils (AckBot)
vi.mock('@/app/api/beUtils', () => ({
  getAckBotStatus: vi.fn().mockResolvedValue(false),
  getAckBotMessage: vi.fn().mockResolvedValue(null),
  send: vi.fn().mockResolvedValue({}),
}));

import { WebhookRouterService, webhookRouterService } from '@/lib/services/whatsapp/webhookRouter';

describe('WebhookRouterService (STEP 8: Webhook → Workspace Routing)', () => {
  const secret = 'meta_test_secret_123';
  const testWorkspaceId = '00000000-0000-0000-0000-000000000001';
  const testPhoneId = 'phone_record_uuid_1';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockResolvedValue({ rows: [] });
  });

  describe('Signature Verification', () => {
    it('returns true when appSecret is empty or not provided', () => {
      expect(webhookRouterService.verifySignature('body', null, '')).toBe(true);
    });

    it('returns false when signature header is missing but secret is configured', () => {
      expect(webhookRouterService.verifySignature('body', null, secret)).toBe(false);
    });

    it('returns true for a valid HMAC-SHA256 signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const expectedHash = crypto.createHmac('sha256', secret).update(body).digest('hex');
      const header = `sha256=${expectedHash}`;

      expect(webhookRouterService.verifySignature(body, header, secret)).toBe(true);
    });

    it('returns false when signature is tampered or wrong', () => {
      const body = JSON.stringify({ test: 'data' });
      const wrongHeader = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      expect(webhookRouterService.verifySignature(body, wrongHeader, secret)).toBe(false);
    });
  });

  describe('Message Content Parsing & Normalization', () => {
    it('parses standard text messages', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'text',
        text: { body: 'Hello world' },
      });
      expect(parsed).toEqual({
        type: 'text',
        body: 'Hello world',
      });
    });

    it('parses image messages with caption and media id', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'image',
        image: { id: 'media_img_123', caption: 'Check this invoice' },
      });
      expect(parsed.type).toBe('image');
      expect(parsed.body).toBe('Check this invoice');
      expect(parsed.caption).toBe('Check this invoice');
      expect(parsed.mediaUrl).toBe('media_img_123');
    });

    it('parses document messages with filename', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'document',
        document: { id: 'doc_456', filename: 'statement.pdf' },
      });
      expect(parsed.type).toBe('document');
      expect(parsed.body).toBe('[Document: statement.pdf]');
      expect(parsed.mediaUrl).toBe('doc_456');
    });

    it('parses interactive button_reply responses', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'btn_confirm', title: 'Confirm Order' },
        },
      });
      expect(parsed.type).toBe('interactive');
      expect(parsed.body).toBe('Confirm Order');
      expect(parsed.interactiveData.id).toBe('btn_confirm');
    });

    it('parses interactive list_reply responses', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: 'item_1', title: 'Option 1', description: 'Detailed info' },
        },
      });
      expect(parsed.type).toBe('interactive');
      expect(parsed.body).toBe('Option 1: Detailed info');
    });

    it('parses location messages', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'location',
        location: { latitude: 37.7749, longitude: -122.4194, name: 'Main Office' },
      });
      expect(parsed.type).toBe('location');
      expect(parsed.body).toBe('[Main Office (37.7749, -122.4194)]');
    });

    it('parses reaction messages', () => {
      const parsed = webhookRouterService.parseMessageContent({
        type: 'reaction',
        reaction: { message_id: 'wamid_123', emoji: '👍' },
      });
      expect(parsed.type).toBe('reaction');
      expect(parsed.body).toBe('[Reaction: 👍]');
    });
  });

  describe('Tenant Workspace Resolution', () => {
    it('resolves workspace by phone_number_id when present in whatsapp_phone_numbers', async () => {
      mockSql.mockImplementation(async (strings: any) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM whatsapp_phone_numbers')) {
          return {
            rows: [{ id: testPhoneId, workspace_id: testWorkspaceId }],
          };
        }
        return { rows: [] };
      });

      const res = await webhookRouterService.resolveWorkspace('1029384756');
      expect(res.workspaceId).toBe(testWorkspaceId);
      expect(res.phoneRecordId).toBe(testPhoneId);
    });

    it('falls back to waba_id when phone_number_id is unknown', async () => {
      mockSql.mockImplementation(async (strings: any) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM whatsapp_phone_numbers')) {
          return { rows: [] };
        }
        if (q.includes('FROM whatsapp_accounts')) {
          return {
            rows: [{ workspace_id: '00000000-0000-0000-0000-000000000099' }],
          };
        }
        return { rows: [] };
      });

      const res = await webhookRouterService.resolveWorkspace('unknown_phone', 'waba_999');
      expect(res.workspaceId).toBe('00000000-0000-0000-0000-000000000099');
    });

    it('gracefully falls back to default workspace when neither is registered', async () => {
      mockSql.mockImplementation(async (strings: any) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM workspaces')) {
          return {
            rows: [{ id: '00000000-0000-0000-0000-000000000002' }],
          };
        }
        return { rows: [] };
      });

      const res = await webhookRouterService.resolveWorkspace('unregistered', 'unregistered_waba');
      expect(res.workspaceId).toBe('00000000-0000-0000-0000-000000000002');
    });
  });

  describe('Full Webhook Processing Flow', () => {
    it('processes inbound text message, persists, and publishes to workspace channel', async () => {
      // 1. Mock DB resolution for phone number
      mockSql.mockImplementation(async (strings: any) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM whatsapp_phone_numbers')) {
          return { rows: [{ id: testPhoneId, workspace_id: testWorkspaceId }] };
        }
        return { rows: [] };
      });

      // 2. Mock message service persistence
      mockRecordInboundMessage.mockResolvedValueOnce({
        workspaceId: testWorkspaceId,
        conversationId: 'conv-uuid-1',
        contact: { id: 'contact-1', profile_name: 'Jane Doe' },
        message: { id: 'msg-1', body: 'Hi, I need support' },
      });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+15551234567',
                    phone_number_id: 'phone_123',
                  },
                  contacts: [{ profile: { name: 'Jane Doe' }, wa_id: '15559876543' }],
                  messages: [
                    {
                      from: '15559876543',
                      id: 'wamid_test_1',
                      timestamp: '1725580000',
                      text: { body: 'Hi, I need support' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await webhookRouterService.processWebhook(JSON.stringify(payload), null, {
        ablyKey: 'test:key',
      });

      expect(result.status).toBe('ok');
      expect(result.processedCount).toBe(1);
      expect(mockRecordInboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumberId: 'phone_123',
          wabaId: 'waba_123',
          from: '15559876543',
          body: 'Hi, I need support',
          metaMessageId: 'wamid_test_1',
        })
      );
      expect(mockChannelsGet).toHaveBeenCalledWith(`workspace:${testWorkspaceId}:inbox`);
      expect(mockPublish).toHaveBeenCalledWith('message:new', expect.objectContaining({
        conversationId: 'conv-uuid-1',
      }));
    });

    it('processes message status updates (delivered, read, failed)', async () => {
      mockSql.mockImplementation(async (strings: any) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM whatsapp_phone_numbers')) {
          return { rows: [{ id: testPhoneId, workspace_id: testWorkspaceId }] };
        }
        return { rows: [] };
      });

      mockUpdateMessageStatus.mockResolvedValueOnce({
        id: 'msg-uuid-99',
        workspace_id: testWorkspaceId,
        conversation_id: 'conv-uuid-99',
        meta_message_id: 'wamid_status_test',
        status: 'delivered',
      });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'phone_123' },
                  statuses: [
                    {
                      id: 'wamid_status_test',
                      status: 'delivered',
                      timestamp: '1725580005',
                      recipient_id: '15559876543',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await webhookRouterService.processWebhook(JSON.stringify(payload), null, {
        ablyKey: 'test:key',
      });

      expect(result.status).toBe('ok');
      expect(mockUpdateMessageStatus).toHaveBeenCalledWith('wamid_status_test', 'delivered', undefined);
      expect(mockChannelsGet).toHaveBeenCalledWith(`workspace:${testWorkspaceId}:inbox`);
      expect(mockPublish).toHaveBeenCalledWith('message:status', expect.objectContaining({
        metaMessageId: 'wamid_status_test',
        status: 'delivered',
      }));
    });

    it('processes calling webhooks (calls field) and fans out to workspace calls channel', async () => {
      mockSql.mockImplementation(async (strings: any) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM whatsapp_phone_numbers')) {
          return { rows: [{ id: testPhoneId, workspace_id: testWorkspaceId }] };
        }
        return { rows: [] };
      });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_123',
            changes: [
              {
                field: 'calls',
                value: {
                  metadata: { phone_number_id: 'phone_123', display_phone_number: '+15551234567' },
                  calls: [
                    {
                      id: 'call_123',
                      from: '+15559876543',
                      event: 'connect',
                      session: { sdp: 'v=0...', sdp_type: 'offer' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await webhookRouterService.processWebhook(JSON.stringify(payload), null, {
        ablyKey: 'test:key',
      });

      expect(result.status).toBe('ok');
      expect(mockChannelsGet).toHaveBeenCalledWith(`workspace:${testWorkspaceId}:calls`);
      expect(mockPublish).toHaveBeenCalledWith('call:event', expect.objectContaining({
        event: 'connect',
        callId: 'call_123',
      }));
    });
  });
});
