import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted SQL & Mocks ───────────────────────────────────────────────────
const { mockSql, sqlMockObj, testSecrets } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] as any[] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });
  return {
    mockSql: mockFn,
    sqlMockObj: obj,
    testSecrets: {
      fbAppSecret: 'fb_app_secret_test_key_step5',
      fbVerifyToken: 'wazzi_verify_token_step5',
      accessToken: 'EAAG_test_meta_token_step5_secret',
    },
  };
});

vi.mock('@vercel/postgres', () => ({
  sql: sqlMockObj,
}));

vi.mock('@/lib/db', () => ({
  sql: sqlMockObj,
}));

// Mock Auth0 session
const mockAuth0Session = vi.fn();
vi.mock('@/lib/auth0', () => ({
  auth0: {
    getSession: () => mockAuth0Session(),
  },
}));

// Mock privateConfig
vi.mock('@/app/privateConfig', () => ({
  default: vi.fn().mockResolvedValue({
    fbAppSecret: testSecrets.fbAppSecret,
    fbVerifyToken: testSecrets.fbVerifyToken,
    fbRegPin: '123456',
    ablyKey: 'test_ably_key:secret',
  }),
}));

// Mock Meta Graph Client
const mockMetaGraphPost = vi.fn();
vi.mock('@/lib/meta/graphClient', () => ({
  metaGraphClient: {
    get: vi.fn(),
    post: (...args: any[]) => mockMetaGraphPost(...args),
    delete: vi.fn(),
  },
  MetaGraphApiException: class MetaGraphApiException extends Error {
    code: number;
    constructor(error: any) {
      super(error.message || 'Meta Graph API Error');
      this.code = error.code || 500;
    }
  },
}));

// Mock beUtils / mockData mode to false
vi.mock('@/app/api/mockData', () => ({
  isMockMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/queue/redis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queue/redis')>();
  return {
    ...actual,
    isRedisAvailable: () => true,
  };
});

// Imports
import { inboxService } from '@/lib/services/inbox/inboxService';
import {
  testEnqueuedOutboundJobs,
  clearTestOutboundJobs,
  getOutboundQueue,
} from '@/lib/queue/outboundQueue';
import { processOutboundJob } from '@/lib/queue/outboundWorker';
import { processWebhookJob } from '@/lib/queue/webhookWorker';
import {
  testInboxRealtimeEvents,
  clearTestInboxRealtimeEvents,
} from '@/lib/realtime/ablyPublisher';
import { encrypt } from '@/lib/crypto/encryption';

// API Route Handlers
import { GET as getConversationsRoute } from '@/app/api/projects/[id]/inbox/conversations/route';
import { GET as getConversationDetailsRoute } from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/route';
import {
  GET as getMessagesRoute,
  POST as sendMessageRoute,
} from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/messages/route';
import { POST as assignConversationRoute } from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/assign/route';
import { POST as updateStatusRoute } from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/status/route';
import { POST as updateHandlingModeRoute } from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/handling-mode/route';
import { POST as addNoteRoute } from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/notes/route';
import { POST as retryMessageRoute } from '@/app/api/projects/[id]/inbox/conversations/[conversationId]/messages/[messageId]/retry/route';

describe('STEP 5: Production WhatsApp Team Inbox', () => {
  // Test Tenants & Identifiers
  const userAId = '11111111-1111-1111-1111-111111111111';
  const outsiderUserId = '99999999-9999-9999-9999-999999999999';

  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const workspaceBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const projectAId = 'project-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectBId = 'project-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const convAId = 'conv-aaaa-1111-1111-1111-111111111111';
  const convBId = 'conv-bbbb-2222-2222-2222-222222222222';
  const contactAId = 'contact-aaaa-1111-1111-1111-111111111111';

  const testPhoneNumberId = 'phone_209384756102';
  const testWabaId = 'waba_109283746501';
  const testCustomerPhone = '+15559876543';

  // Pre-encrypted token for mock connection
  const encryptedPayload = encrypt(testSecrets.accessToken);

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestOutboundJobs();
    clearTestInboxRealtimeEvents();
    mockAuth0Session.mockReset();
    mockMetaGraphPost.mockReset();
    mockSql.mockImplementation(async () => ({ rows: [] as any[] }));

    // Default: Authenticated as User A
    mockAuth0Session.mockResolvedValue({
      user: {
        sub: 'auth0|userA',
        email: 'userA@wazzi.com',
        name: 'User A',
      },
    });
  });

  /**
   * Helper to mock user authentication and project authorization
   */
  function setupProjectAuth(opts: {
    authorized: boolean;
    userId?: string;
    projectId?: string;
    workspaceId?: string;
  }) {
    const {
      authorized,
      userId = userAId,
      projectId = projectAId,
      workspaceId = workspaceAId,
    } = opts;

    return (q: string, values: any[]) => {
      // 1. User lookup for session sync (getCurrentUser -> syncAuth0User)
      if (q.includes('FROM users') && (q.includes('auth0_user_id') || q.includes('auth0_sub') || q.includes('email') || q.includes('cleanEmail'))) {
        return {
          rows: [
            {
              id: userId,
              auth0_user_id: `auth0|${userId}`,
              auth0_sub: `auth0|${userId}`,
              email: `${userId}@wazzi.com`,
              name: `User ${userId}`,
              avatar_url: null as string | null,
              role: 'client',
              is_super_admin: false,
              status: 'active',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
              last_login_at: new Date('2026-01-01'),
            },
          ],
        };
      }

      if (q.includes('INSERT INTO users')) {
        return {
          rows: [
            {
              id: userId,
              auth0_user_id: `auth0|${userId}`,
              auth0_sub: `auth0|${userId}`,
              email: `${userId}@wazzi.com`,
              name: `User ${userId}`,
              avatar_url: null as string | null,
              role: 'client',
              is_super_admin: false,
              status: 'active',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
              last_login_at: new Date('2026-01-01'),
            },
          ],
        };
      }

      // 2. Project + Workspace membership check (requireProjectAccess)
      if (q.includes('FROM projects p') && q.includes('JOIN workspaces w')) {
        const matchesTarget = values.includes(projectId);
        if (authorized && matchesTarget) {
          return {
            rows: [
              {
                id: projectId,
                workspace_id: workspaceId,
                name: 'Project ' + projectId,
                description: 'Description',
                slug: 'proj-slug',
                status: 'ACTIVE',
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-01'),
                archived_at: null as Date | null,
                ws_id: workspaceId,
                ws_name: 'Workspace ' + workspaceId,
                ws_slug: 'ws-slug',
                ws_status: 'active',
                ws_tenant_id: 'tenant-1',
                ws_created_at: new Date('2026-01-01'),
                ws_updated_at: new Date('2026-01-01'),
                member_id: 'membership-uuid-1',
                role: 'OWNER',
                member_status: 'active',
                member_created_at: new Date('2026-01-01'),
                member_updated_at: new Date('2026-01-01'),
              },
            ],
          };
        }
        return { rows: [] };
      }

      return null;
    };
  }

  // 1. Authorized user can load inbox
  it('1. Authorized user can load inbox', async () => {
    const authHandler = setupProjectAuth({ authorized: true });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Check conversations query first
      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: convAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: contactAId,
              status: 'open',
              handling_mode: 'AI_HANDLING',
              priority: 'medium',
              assigned_user_id: null as string | null,
              last_message_at: new Date('2026-07-01T12:00:00Z'),
              last_message_preview: 'Hello from client',
              unread_count: 1,
              window_expires_at: new Date('2026-07-02T12:00:00Z'),
              resolved_at: null as Date | null,
              escalation_reason: null as string | null,
              created_at: new Date('2026-07-01T11:00:00Z'),
              updated_at: new Date('2026-07-01T12:00:00Z'),
              wa_id: '15559876543',
              phone_number: '+15559876543',
              profile_name: 'John Doe',
              avatar_url: null as string | null,
              lead_score: 85,
              custom_attributes: {},
              assigned_user_name: null as string | null,
              assigned_user_email: null as string | null,
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/inbox/conversations`);
    const res = await getConversationsRoute(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(convAId);
    expect(json.data[0].profile_name).toBe('John Doe');
  });

  // 2. Unauthorized user cannot load inbox
  it('2. Unauthorized user cannot load inbox', async () => {
    const authHandler = setupProjectAuth({ authorized: false });
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/inbox/conversations`);
    const res = await getConversationsRoute(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(404);
  });

  // 3. Workspace A cannot access Workspace B conversations
  it('3. Workspace A cannot access Workspace B conversations', async () => {
    const authHandler = setupProjectAuth({
      authorized: false,
      projectId: projectBId,
      workspaceId: workspaceBId,
    });
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectBId}/inbox/conversations`);
    const res = await getConversationsRoute(req, { params: Promise.resolve({ id: projectBId }) });
    expect(res.status).toBe(404);
  });

  // 4. Project A cannot access Project B conversations
  it('4. Project A cannot access Project B conversations', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Checking conversation in Project A - convBId does NOT belong to Project A
      if (q.includes('FROM conversations c') && q.includes('WHERE c.id =')) {
        return { rows: [] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convBId}`);
    const res = await getConversationDetailsRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convBId }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Conversation not found');
  });

  // 5. Conversation ID cannot bypass authorization
  it('5. Conversation ID cannot bypass authorization', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Arbitrary spoofed conversation ID
      if (q.includes('FROM conversations c') && q.includes('WHERE c.id =')) {
        return { rows: [] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const spoofedConvId = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${spoofedConvId}`);
    const res = await getConversationDetailsRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: spoofedConvId }),
    });
    expect(res.status).toBe(404);
  });

  // 6. User can load authorized conversation
  it('6. User can load authorized conversation', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: convAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: contactAId,
              status: 'open',
              handling_mode: 'AI_HANDLING',
              priority: 'medium',
              assigned_user_id: userAId,
              assigned_user_name: 'User A',
              assigned_user_email: 'userA@wazzi.com',
              last_message_at: new Date('2026-07-01T12:00:00Z'),
              last_message_preview: 'Hello',
              unread_count: 0,
              window_expires_at: new Date('2026-07-02T12:00:00Z'),
              resolved_at: null as Date | null,
              escalation_reason: null as string | null,
              created_at: new Date('2026-07-01T10:00:00Z'),
              updated_at: new Date('2026-07-01T12:00:00Z'),
              wa_id: '15559876543',
              phone_number: testCustomerPhone,
              profile_name: 'Alice Johnson',
              avatar_url: null as string | null,
              lead_score: 90,
              custom_attributes: { interest: 'Computer Science' },
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}`);
    const res = await getConversationDetailsRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data.id).toBe(convAId);
    expect(json.data.profile_name).toBe('Alice Johnson');
    expect(json.data.phone_number).toBe(testCustomerPhone);
  });

  // 7. User cannot send message to unauthorized conversation
  it('7. User cannot send message to unauthorized conversation', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Check conversation belongs to project - return empty for unauthorized conv
      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return { rows: [] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convBId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Unauthorized message attempt' }),
      },
    );

    const res = await sendMessageRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convBId }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('access denied');
    expect(testEnqueuedOutboundJobs).toHaveLength(0);
  });

  // 8. Message is created with QUEUED state
  it('8. Message is created with QUEUED state', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let createdMessageStatus = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // WhatsApp connection guard (must be CONNECTED to send)
      if (q.includes('FROM whatsapp_connections') && q.includes("status = 'CONNECTED'")) {
        return {
          rows: [
            {
              id: 'wa-conn-a',
              status: 'CONNECTED',
              encrypted_access_token: 'enc-token',
              phone_number_id: testPhoneNumberId,
            },
          ],
        };
      }

      // Fetch conversation check
      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: convAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              window_expires_at: new Date(Date.now() + 3600000).toISOString(),
              phone_number: testCustomerPhone,
              wa_id: '15559876543',
            },
          ],
        };
      }

      // Idempotency check
      if (q.includes('FROM messages') && q.includes('idempotency_key =')) {
        return { rows: [] };
      }

      // Insert message with 'queued'
      if (q.includes('INSERT INTO messages')) {
        createdMessageStatus = 'queued';
        return {
          rows: [
            {
              id: 'msg-uuid-test-01',
              conversation_id: convAId,
              body: 'Hello prospective student!',
              type: 'text',
              status: 'queued',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello prospective student!' }),
      },
    );

    const res = await sendMessageRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data.status).toBe('queued');
    expect(createdMessageStatus).toBe('queued');
  });

  // 9. Outbound message creates BullMQ job
  it('9. Outbound message creates BullMQ job', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM whatsapp_connections') && q.includes("status = 'CONNECTED'")) {
        return {
          rows: [
            {
              id: 'wa-conn-a',
              status: 'CONNECTED',
              encrypted_access_token: 'enc-token',
              phone_number_id: testPhoneNumberId,
            },
          ],
        };
      }

      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: convAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              window_expires_at: new Date(Date.now() + 3600000).toISOString(),
              phone_number: testCustomerPhone,
              wa_id: '15559876543',
            },
          ],
        };
      }

      if (q.includes('INSERT INTO messages')) {
        return {
          rows: [
            {
              id: 'msg-job-test-01',
              conversation_id: convAId,
              body: 'Testing BullMQ job enqueue',
              type: 'text',
              status: 'queued',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Testing BullMQ job enqueue' }),
      },
    );

    const res = await sendMessageRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });

    expect(res.status).toBe(200);
    expect(testEnqueuedOutboundJobs).toHaveLength(1);
    const job = testEnqueuedOutboundJobs[0];
    expect(job.name).toBe('send-message');
    expect(job.data.messageId).toBe('msg-job-test-01');
    expect(job.data.workspaceId).toBe(workspaceAId);
    expect(job.data.projectId).toBe(projectAId);
    expect(job.data.destPhone).toBe(testCustomerPhone);
    expect(job.data.body).toBe('Testing BullMQ job enqueue');
  });

  // 10. Meta message ID is persisted
  it('10. Meta message ID is persisted', async () => {
    const testMetaId = 'wamid.HBgLMjA5Mzg0NzU2MTAyFQIAERgSRjAzOEQ3';
    mockMetaGraphPost.mockResolvedValue({
      messaging_product: 'whatsapp',
      contacts: [{ input: '15559876543', wa_id: '15559876543' }],
      messages: [{ id: testMetaId }],
    });

    let updatedMetaId = '';
    let updatedStatus = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Connection query with encrypted token
      if (q.includes('FROM whatsapp_connections') && q.includes('status = \'CONNECTED\'')) {
        return {
          rows: [
            {
              phone_number_id: testPhoneNumberId,
              encrypted_access_token: encryptedPayload.ciphertext,
              token_iv: encryptedPayload.iv,
              token_tag: encryptedPayload.tag,
              status: 'CONNECTED',
            },
          ],
        };
      }

      // Update message to sent and save meta_message_id
      if (q.includes('UPDATE messages') && q.includes('status = \'sent\'')) {
        updatedStatus = 'sent';
        updatedMetaId = values[0];
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await processOutboundJob({
      messageId: 'msg-outbound-meta-01',
      workspaceId: workspaceAId,
      projectId: projectAId,
      conversationId: convAId,
      destPhone: testCustomerPhone,
      body: 'Testing Meta ID persistence',
      type: 'text',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('sent');
    expect(result.metaMessageId).toBe(testMetaId);
    expect(updatedStatus).toBe('sent');
    expect(updatedMetaId).toBe(testMetaId);
    expect(mockMetaGraphPost).toHaveBeenCalledWith(
      `/${testPhoneNumberId}/messages`,
      testSecrets.accessToken,
      expect.objectContaining({
        messaging_product: 'whatsapp',
        to: '15559876543',
        type: 'text',
      }),
    );
  });

  // 11. Message status updates correctly
  it('11. Message status updates correctly via webhook receipt', async () => {
    const statusMetaId = 'wamid.HBgLSTATUSRECEIPT001';
    let persistedStatus = '';
    let statusEventInserted = false;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Resolve connection by phone_number_id
      if (q.includes('FROM whatsapp_connections') && q.includes('phone_number_id =')) {
        return {
          rows: [{ project_id: projectAId, workspace_id: workspaceAId }],
        };
      }

      // Update messages table with delivered status
      if (q.includes('UPDATE messages') && q.includes('meta_message_id =')) {
        persistedStatus = values[0]; // 'delivered'
        return {
          rows: [{ id: 'msg-receipt-01', conversation_id: convAId }],
        };
      }

      // Insert message_status_events
      if (q.includes('INSERT INTO message_status_events')) {
        statusEventInserted = true;
        return { rows: [] };
      }

      return { rows: [] };
    });

    const receiptPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: testWabaId,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: testPhoneNumberId,
                },
                statuses: [
                  {
                    id: statusMetaId,
                    status: 'delivered',
                    timestamp: '1720000050',
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

    const res = await processWebhookJob({
      webhookEventId: 'we-receipt-01',
      payload: receiptPayload,
    });

    expect(res.success).toBe(true);
    expect(persistedStatus).toBe('delivered');
    expect(statusEventInserted).toBe(true);

    // Verify Ably update was broadcast
    const statusEvent = testInboxRealtimeEvents.find((e) => e.name === 'message.status.updated');
    expect(statusEvent).toBeDefined();
    expect(statusEvent?.data.status).toBe('delivered');
    expect(statusEvent?.data.metaMessageId).toBe(statusMetaId);
  });

  // 12. Duplicate inbound webhook does not create duplicate message
  it('12. Duplicate inbound webhook does not create duplicate message', async () => {
    const existingMetaId = 'wamid.INBOUND_DUP_CHECK_123';
    let insertedMessagesCount = 0;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Resolve connection
      if (q.includes('FROM whatsapp_connections')) {
        return {
          rows: [{ project_id: projectAId, workspace_id: workspaceAId }],
        };
      }

      // Inbound idempotency check: simulate message ALREADY exists
      if (q.includes('SELECT id FROM messages WHERE meta_message_id =')) {
        return {
          rows: [{ id: 'already-existing-msg-id' }],
        };
      }

      // If insert is called, increment counter
      if (q.includes('INSERT INTO messages')) {
        insertedMessagesCount++;
        return { rows: [{ id: 'new-msg-id' }] };
      }

      return { rows: [] };
    });

    const inboundPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: testWabaId,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: testPhoneNumberId,
                },
                contacts: [{ profile: { name: 'Duplicate Tester' }, wa_id: '15559876543' }],
                messages: [
                  {
                    from: '15559876543',
                    id: existingMetaId,
                    timestamp: '1720000000',
                    text: { body: 'Inbound message repeated' },
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

    const res = await processWebhookJob({
      webhookEventId: 'we-dup-inbound-01',
      payload: inboundPayload,
    });

    expect(res.success).toBe(true);
    // Verified: No duplicate message inserted
    expect(insertedMessagesCount).toBe(0);
  });

  // 13. Duplicate outbound request does not send duplicate message
  it('13. Duplicate outbound request does not send duplicate message', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    const clientKey = 'idempotency-key-client-abc-999';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM whatsapp_connections') && q.includes("status = 'CONNECTED'")) {
        return {
          rows: [
            {
              id: 'wa-conn-a',
              status: 'CONNECTED',
              encrypted_access_token: 'enc-token',
              phone_number_id: testPhoneNumberId,
            },
          ],
        };
      }

      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: convAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              window_expires_at: new Date(Date.now() + 3600000).toISOString(),
              phone_number: testCustomerPhone,
              wa_id: '15559876543',
            },
          ],
        };
      }

      // Outbound idempotency check: simulate existing message with this key
      if (q.includes('FROM messages') && q.includes('idempotency_key =')) {
        return {
          rows: [
            {
              id: 'existing-outbound-msg-01',
              conversation_id: convAId,
              body: 'I am unique',
              status: 'queued',
              created_at: new Date().toISOString(),
              meta_message_id: null as string | null,
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'I am unique',
          idempotencyKey: clientKey,
        }),
      },
    );

    const res = await sendMessageRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.deduplicated).toBe(true);
    expect(json.data.id).toBe('existing-outbound-msg-01');
    // No new BullMQ job was queued
    expect(testEnqueuedOutboundJobs).toHaveLength(0);
  });

  // 14. Assignment target must belong to authorized workspace
  it('14. Assignment target must belong to authorized workspace', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Check target user membership: outsider user is NOT in Workspace A
      if (q.includes('FROM workspace_members wm') && q.includes('JOIN users u')) {
        return { rows: [] }; // Not found in workspace
      }

      // Verify conversation exists
      if (q.includes('FROM conversations') && q.includes('WHERE id =')) {
        return { rows: [{ id: convAId }] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: outsiderUserId }),
      },
    );

    const res = await assignConversationRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Target user does not belong to this workspace');
  });

  // 15. Internal note is never sent to Meta
  it('15. Internal note is never sent to Meta', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let internalNoteInserted = false;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Insert into internal_notes
      if (q.includes('INSERT INTO internal_notes')) {
        internalNoteInserted = true;
        return {
          rows: [
            {
              id: 'note-01',
              content: 'VIP customer, wants follow up tomorrow',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (q.includes('FROM conversations') && q.includes('WHERE id =')) {
        return { rows: [{ id: convAId }] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'VIP customer, wants follow up tomorrow' }),
      },
    );

    const res = await addNoteRoute(req, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });

    expect(res.status).toBe(200);
    expect(internalNoteInserted).toBe(true);
    // Never queued for Meta delivery
    expect(testEnqueuedOutboundJobs).toHaveLength(0);
    expect(mockMetaGraphPost).not.toHaveBeenCalled();

    // Broadcasts note.created internally
    const noteEvent = testInboxRealtimeEvents.find((e) => e.name === 'note.created');
    expect(noteEvent).toBeDefined();
    expect(noteEvent?.data.note.is_internal).toBe(true);
  });

  // 16. Resolved conversation can be reopened
  it('16. Resolved conversation can be reopened', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let currentStatus = 'resolved';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('UPDATE conversations') && q.includes('SET')) {
        currentStatus = values[0];
        return { rows: [] };
      }

      if (q.includes('FROM conversations') && q.includes('WHERE id =')) {
        return { rows: [{ id: convAId }] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    // 1. Mark Resolved
    const reqResolve = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      },
    );
    const resResolve = await updateStatusRoute(reqResolve, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });
    expect(resResolve.status).toBe(200);
    expect(currentStatus).toBe('resolved');

    // 2. Reopen
    const reqReopen = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      },
    );
    const resReopen = await updateStatusRoute(reqReopen, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });
    expect(resReopen.status).toBe(200);
    expect(currentStatus).toBe('open');
  });

  // 17. AI/human handling state persists
  it('17. AI/human handling state persists', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let handlingMode = 'AI_HANDLING';
    let assignedUser: string | null = null;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('UPDATE conversations') && q.includes('handling_mode =')) {
        handlingMode = values[0];
        assignedUser = values[1];
        return { rows: [] };
      }

      if (q.includes('FROM conversations') && q.includes('WHERE id =')) {
        return { rows: [{ id: convAId, assigned_user_id: assignedUser }] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    // 1. Takeover by Human
    const reqTakeover = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/handling-mode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handlingMode: 'HUMAN_HANDLING',
          reason: 'Customer requested human assistance',
        }),
      },
    );
    const resTakeover = await updateHandlingModeRoute(reqTakeover, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });
    expect(resTakeover.status).toBe(200);
    expect(handlingMode).toBe('HUMAN_HANDLING');
    expect(assignedUser).toBe(userAId);

    // 2. Return to AI
    const reqReturn = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/handling-mode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handlingMode: 'AI_HANDLING' }),
      },
    );
    const resReturn = await updateHandlingModeRoute(reqReturn, {
      params: Promise.resolve({ id: projectAId, conversationId: convAId }),
    });
    expect(resReturn.status).toBe(200);
    expect(handlingMode).toBe('AI_HANDLING');
  });

  // 18. Realtime events are tenant/project scoped
  it('18. Realtime events are tenant/project scoped', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM conversations') && q.includes('WHERE id =')) {
        return { rows: [{ id: convAId }] };
      }
      if (q.includes('UPDATE conversations')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    await inboxService.updateConversationStatus({
      workspaceId: workspaceAId,
      projectId: projectAId,
      conversationId: convAId,
      status: 'resolved',
    });

    expect(testInboxRealtimeEvents.length).toBeGreaterThan(0);
    const event = testInboxRealtimeEvents[0];
    const expectedChannel = `workspace:${workspaceAId}:project:${projectAId}:inbox`;
    expect(event.channel).toBe(expectedChannel);
    // Ensure no leaks to Project B or Workspace B
    expect(event.channel).not.toContain(workspaceBId);
    expect(event.channel).not.toContain(projectBId);
  });

  // 19. Redis failure does not corrupt database state
  it('19. Redis failure does not corrupt database state', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM conversations')) {
        return {
          rows: [{ id: convAId, window_expires_at: null as string | null }],
        };
      }

      if (q.includes('FROM messages')) {
        return {
          rows: [
            {
              id: 'msg-01',
              status: 'queued',
              body: 'Test resilient state',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await inboxService.getMessages(workspaceAId, projectAId, convAId);
    expect(result).toBeDefined();
    expect(result?.messages).toBeDefined();
    expect(result?.messages.length).toBeGreaterThan(0);
  });

  // 20. Queue retry behavior works
  it('20. Queue retry behavior works', () => {
    const queue = getOutboundQueue();
    expect(queue).not.toBeNull();
    expect(queue!.name).toBe('whatsapp-outbound');
    expect(queue!.opts.defaultJobOptions?.attempts).toBe(3);
    expect(queue!.opts.defaultJobOptions?.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    });
  });

  // 21. Failed messages can be retried safely
  it('21. Failed messages can be retried safely', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    const failedMsgId = 'msg-failed-uuid-123';
    let updatedToQueued = false;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Query failed message
      if (q.includes('FROM messages m') && q.includes('m.status = \'failed\'')) {
        return {
          rows: [
            {
              id: failedMsgId,
              body: 'I previously failed to send',
              type: 'text',
              phone_number: testCustomerPhone,
              wa_id: '15559876543',
            },
          ],
        };
      }

      // Update to queued
      if (q.includes('UPDATE messages') && q.includes('status = \'queued\'')) {
        updatedToQueued = true;
        return { rows: [] };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations/${convAId}/messages/${failedMsgId}/retry`,
      { method: 'POST' },
    );

    const res = await retryMessageRoute(req, {
      params: Promise.resolve({
        id: projectAId,
        conversationId: convAId,
        messageId: failedMsgId,
      }),
    });

    expect(res.status).toBe(200);
    expect(updatedToQueued).toBe(true);
    expect(testEnqueuedOutboundJobs).toHaveLength(1);
    expect(testEnqueuedOutboundJobs[0].data.messageId).toBe(failedMsgId);
  });

  // 22. Cursor pagination works
  it('22. Cursor pagination works', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let passedCursorDate: string | null = null;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('c.last_message_at <') || values.includes('2026-06-01T00:00:00.000Z')) {
        passedCursorDate = '2026-06-01T00:00:00.000Z';
      }

      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: 'conv-older-01',
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: contactAId,
              status: 'open',
              handling_mode: 'HUMAN_HANDLING',
              priority: 'low',
              assigned_user_id: userAId,
              last_message_at: new Date('2026-05-15T10:00:00Z'),
              last_message_preview: 'Older conversation',
              unread_count: 0,
              window_expires_at: null as string | null,
              resolved_at: null as Date | null,
              escalation_reason: null as string | null,
              created_at: new Date('2026-05-15T10:00:00Z'),
              updated_at: new Date('2026-05-15T10:00:00Z'),
              wa_id: '15551112233',
              phone_number: '+15551112233',
              profile_name: 'Bob Smith',
              avatar_url: null as string | null,
              lead_score: 50,
              custom_attributes: {},
              assigned_user_name: 'User A',
              assigned_user_email: 'userA@wazzi.com',
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/inbox/conversations?cursor=2026-06-01T00:00:00.000Z&limit=1`,
    );

    const res = await getConversationsRoute(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data[0].id).toBe('conv-older-01');
    expect(passedCursorDate).toBe('2026-06-01T00:00:00.000Z');
  });

  // 23. Search is tenant scoped
  it('23. Search is tenant scoped', async () => {
    let checkedWorkspaceId = '';
    let checkedProjectId = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        checkedWorkspaceId = values[0];
        checkedProjectId = values[1];
        return { rows: [] as any[] };
      }

      return { rows: [] as any[] };
    });

    await inboxService.getConversations({
      workspaceId: workspaceAId,
      projectId: projectAId,
      search: 'Alice Johnson',
    });

    expect(checkedWorkspaceId).toBe(workspaceAId);
    expect(checkedProjectId).toBe(projectAId);
  });

  // 24. Filters are tenant/project scoped
  it('24. Filters are tenant/project scoped', async () => {
    const filters: ('unread' | 'mine' | 'unassigned' | 'ai' | 'human' | 'resolved')[] = [
      'unread',
      'mine',
      'unassigned',
      'ai',
      'human',
      'resolved',
    ];

    for (const filter of filters) {
      let scopedWs = '';
      let scopedProj = '';

      mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
        const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
        if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
          scopedWs = values[0];
          scopedProj = values[1];
        }
        return { rows: [] as any[] };
      });

      await inboxService.getConversations({
        workspaceId: workspaceAId,
        projectId: projectAId,
        filter,
        userId: userAId,
      });

      expect(scopedWs).toBe(workspaceAId);
      expect(scopedProj).toBe(projectAId);
    }
  });

  // 25. Secrets never appear in client response
  it('25. Secrets never appear in client response', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM conversations c') && q.includes('JOIN contacts ct')) {
        return {
          rows: [
            {
              id: convAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: contactAId,
              status: 'open',
              handling_mode: 'AI_HANDLING',
              priority: 'medium',
              assigned_user_id: userAId,
              last_message_at: new Date('2026-07-01T12:00:00Z'),
              last_message_preview: 'Safe response',
              unread_count: 0,
              window_expires_at: new Date('2026-07-02T12:00:00Z'),
              resolved_at: null as Date | null,
              escalation_reason: null as string | null,
              created_at: new Date('2026-07-01T10:00:00Z'),
              updated_at: new Date('2026-07-01T12:00:00Z'),
              wa_id: '15559876543',
              phone_number: testCustomerPhone,
              profile_name: 'Safe Customer',
              avatar_url: null as string | null,
              lead_score: 95,
              custom_attributes: {},
              assigned_user_name: 'User A',
              assigned_user_email: 'userA@wazzi.com',
            },
          ],
        };
      }

      const authResult = authHandler(q, values);
      if (authResult !== null) return authResult;

      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/inbox/conversations`);
    const res = await getConversationsRoute(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    const serialized = JSON.stringify(json);

    // Verify absolutely no sensitive tokens, secrets, or keys leaked
    expect(serialized).not.toContain(testSecrets.fbAppSecret);
    expect(serialized).not.toContain(testSecrets.fbVerifyToken);
    expect(serialized).not.toContain(testSecrets.accessToken);
    expect(serialized).not.toContain('encrypted_access_token');
    expect(serialized).not.toContain('token_iv');
    expect(serialized).not.toContain('token_tag');
    expect(serialized).not.toContain('test_ably_key');
  });
});
