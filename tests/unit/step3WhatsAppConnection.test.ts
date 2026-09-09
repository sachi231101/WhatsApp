import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// ── Hoisted SQL & Queue Mocks ──────────────────────────────────────────────
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
      fbAppSecret: 'fb_app_secret_test_key_12345',
      fbVerifyToken: 'wazzi_verify_token_secure',
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
    ablyKey: 'test_ably_key',
  }),
}));

const TEST_APP_SECRET = testSecrets.fbAppSecret;
const TEST_VERIFY_TOKEN = testSecrets.fbVerifyToken;

// Mock beUtils getToken and subscribeWebhook
const mockGetToken = vi.fn();
const mockSubscribeWebhook = vi.fn();
vi.mock('@/app/api/beUtils', () => ({
  getToken: (...args: any[]) => mockGetToken(...args),
  subscribeWebhook: (...args: any[]) => mockSubscribeWebhook(...args),
  isMockMode: vi.fn().mockReturnValue(false),
}));

// Mock Meta Graph Client
const mockMetaGraphGet = vi.fn();
vi.mock('@/lib/meta/graphClient', () => ({
  metaGraphClient: {
    get: (...args: any[]) => mockMetaGraphGet(...args),
    post: vi.fn(),
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

// Import services and route handlers
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import { testEnqueuedJobs, clearTestJobs } from '@/lib/queue/webhookQueue';
import { processWebhookJob } from '@/lib/queue/webhookWorker';
import { GET as getProjectWhatsApp } from '@/app/api/projects/[id]/whatsapp/route';
import { POST as connectProjectWhatsApp } from '@/app/api/projects/[id]/whatsapp/connect/route';
import { GET as checkProjectWhatsAppHealth } from '@/app/api/projects/[id]/whatsapp/health/route';
import { POST as disconnectProjectWhatsApp } from '@/app/api/projects/[id]/whatsapp/disconnect/route';
import { GET as verifyWebhook, POST as receiveWebhook } from '@/app/api/webhooks/route';
import { encrypt, decrypt } from '@/lib/crypto/encryption';

describe('STEP 3: Production WhatsApp Business Connection', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const workspaceBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const projectAId = 'project-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectBId = 'project-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const testWabaId = 'waba_109283746501';
  const testPhoneId = 'phone_209384756102';
  const testDisplayPhone = '+1 555 234 5678';
  const testRawToken = 'EAAG_test_meta_access_token_secret_value_xyz';

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestJobs();
    mockAuth0Session.mockReset();
    mockGetToken.mockResolvedValue(testRawToken);
    mockSubscribeWebhook.mockResolvedValue({ success: true });
    mockMetaGraphGet.mockReset();
    mockSql.mockImplementation(async () => ({ rows: [] as any[] }));

    // Default authenticated user A
    mockAuth0Session.mockResolvedValue({
      user: {
        sub: 'auth0|userA',
        email: 'userA@wazzi.com',
        name: 'User A',
      },
    });
  });

  // Helper to mock project authorization
  function mockProjectAccess(authorized: boolean, role: string = 'OWNER', targetWs = workspaceAId, targetProj = projectAId) {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // User lookup
      if (q.includes('FROM users')) {
        return {
          rows: [
            {
              id: userAId,
              auth0_sub: 'auth0|userA',
              email: 'userA@wazzi.com',
              name: 'User A',
              role: 'client',
              is_super_admin: false,
              status: 'active',
            },
          ],
        };
      }

      // Project + Workspace membership check
      if (q.includes('FROM projects p') && q.includes('JOIN workspaces w')) {
        const queryProjId = values[1];
        if (authorized && queryProjId === targetProj) {
          return {
            rows: [
              {
                id: targetProj,
                workspace_id: targetWs,
                name: 'Test Project',
                description: 'Description',
                slug: 'test-project',
                status: 'ACTIVE',
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-01'),
                archived_at: null as Date | null,
                ws_id: targetWs,
                ws_name: 'Workspace A',
                ws_slug: 'workspace-a',
                ws_status: 'active',
                ws_tenant_id: 'tenant-1',
                ws_created_at: new Date('2026-01-01'),
                ws_updated_at: new Date('2026-01-01'),
                member_id: 'membership-uuid-1',
                role,
                member_status: 'active',
                member_created_at: new Date('2026-01-01'),
                member_updated_at: new Date('2026-01-01'),
              },
            ],
          };
        }
        return { rows: [] };
      }

      return { rows: [] };
    });
  }

  // 1. User can access own project's WhatsApp page/API
  it('1. User can access own project WhatsApp page/API', async () => {
    mockProjectAccess(true, 'MEMBER');

    // Mock existing connection
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) {
        return { rows: [{ id: userAId, email: 'userA@wazzi.com', role: 'client', is_super_admin: false }] };
      }
      if (q.includes('FROM projects p')) {
        return {
          rows: [
            {
              id: projectAId,
              workspace_id: workspaceAId,
              name: 'Admissions',
              slug: 'admissions',
              ws_id: workspaceAId,
              ws_name: 'Workspace A',
              member_id: 'm-1',
              role: 'MEMBER',
            },
          ],
        };
      }
      if (q.includes('FROM whatsapp_connections')) {
        return {
          rows: [
            {
              id: 'conn-1',
              workspace_id: workspaceAId,
              project_id: projectAId,
              waba_id: testWabaId,
              phone_number_id: testPhoneId,
              display_phone_number: testDisplayPhone,
              verified_name: 'Wazzi Support',
              business_name: 'Wazzi Inc',
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
              last_verified_at: new Date('2026-01-01'),
              disconnected_at: null as Date | null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/whatsapp`);
    const res = await getProjectWhatsApp(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data.wabaId).toBe(testWabaId);
    expect(json.data.displayPhoneNumber).toBe(testDisplayPhone);
  });

  // 2. User cannot access another workspace's WhatsApp page/API
  it('2. User cannot access another workspace WhatsApp page/API', async () => {
    // User is NOT a member of Workspace B
    mockProjectAccess(false);

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectBId}/whatsapp`);
    const res = await getProjectWhatsApp(req, { params: Promise.resolve({ id: projectBId }) });
    expect(res.status).toBe(404); // Non-disclosing 404
  });

  // 3. User cannot change projectId to bypass authorization
  it('3. User cannot change projectId to bypass authorization', async () => {
    mockProjectAccess(false);

    const req = new NextRequest('http://localhost:3000/api/projects/tampered-project-id/whatsapp');
    const res = await getProjectWhatsApp(req, { params: Promise.resolve({ id: 'tampered-project-id' }) });
    expect(res.status).toBe(404);
  });

  // 4. User cannot change workspaceId to bypass authorization
  it('4. User cannot change workspaceId to bypass authorization', async () => {
    // Project belongs to workspace B, user is in workspace A
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) {
        return { rows: [{ id: userAId, email: 'userA@wazzi.com', role: 'client' }] };
      }
      // p.workspace_id = workspaceBId, but user has no membership in workspaceB
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectBId}/whatsapp`);
    const res = await getProjectWhatsApp(req, { params: Promise.resolve({ id: projectBId }) });
    expect(res.status).toBe(404);
  });

  // 5. Non-member cannot create/modify a connection
  it('5. Non-member cannot create/modify a connection', async () => {
    mockProjectAccess(false);

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/whatsapp/connect`, {
      method: 'POST',
      body: JSON.stringify({
        code: 'valid_code',
        appId: '123456',
      }),
    });
    const res = await connectProjectWhatsApp(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(404);
  });

  // 6. Meta callback is validated
  it('6. Meta callback is validated on connect', async () => {
    mockProjectAccess(true, 'MEMBER');

    mockMetaGraphGet.mockImplementation(async (path: string) => {
      if (path.includes(testWabaId)) {
        return { id: testWabaId, name: 'Acme Corp', phone_numbers: { data: [{ id: testPhoneId, display_phone_number: testDisplayPhone }] } };
      }
      if (path.includes(testPhoneId)) {
        return { id: testPhoneId, display_phone_number: testDisplayPhone, verified_name: 'Acme Support' };
      }
      return {};
    });

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) return { rows: [{ id: userAId, email: 'userA@wazzi.com' }] };
      if (q.includes('FROM projects p')) {
        return { rows: [{ id: projectAId, workspace_id: workspaceAId, ws_id: workspaceAId, member_id: 'm-1', role: 'MEMBER' }] };
      }
      if (q.includes('INSERT INTO whatsapp_connections')) {
        return {
          rows: [
            {
              id: 'conn-new-1',
              workspace_id: workspaceAId,
              project_id: projectAId,
              waba_id: testWabaId,
              phone_number_id: testPhoneId,
              display_phone_number: testDisplayPhone,
              verified_name: 'Acme Support',
              business_name: 'Acme Corp',
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
              last_verified_at: new Date(),
              disconnected_at: null as Date | null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/whatsapp/connect`, {
      method: 'POST',
      body: JSON.stringify({
        code: 'valid_meta_auth_code',
        appId: '123456789',
        sessionInfo: {
          data: {
            waba_id: testWabaId,
            phone_number_id: testPhoneId,
            business_id: 'biz_1',
            page_ids: [],
            ad_account_ids: [],
            catalog_ids: [],
            dataset_ids: [],
            instagram_account_ids: [],
          },
          type: 'WA_EMBEDDED_SIGNUP',
          event: 'FINISH',
        },
      }),
    });

    const res = await connectProjectWhatsApp(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data.status).toBe('CONNECTED');
    expect(mockGetToken).toHaveBeenCalledWith('valid_meta_auth_code', '123456789');
  });

  // 7. Invalid callback is rejected
  it('7. Invalid callback is rejected when code or appId is missing', async () => {
    mockProjectAccess(true, 'MEMBER');

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/whatsapp/connect`, {
      method: 'POST',
      body: JSON.stringify({
        code: '', // missing code
        appId: '',
      }),
    });

    const res = await connectProjectWhatsApp(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("authenticate");
  });

  // 8. Connection is stored against correct workspace
  it('8. Connection is stored against correct workspace', async () => {
    let insertedWorkspaceId: string | undefined;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('INSERT INTO whatsapp_connections')) {
        insertedWorkspaceId = values[0];
        return {
          rows: [
            {
              id: 'conn-1',
              workspace_id: values[0],
              project_id: values[1],
              waba_id: values[2],
              phone_number_id: values[3],
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    await projectConnectionService.connectProject({
      projectId: projectAId,
      workspaceId: workspaceAId,
      code: 'auth_code_1',
      appId: 'app_1',
      directWabaId: testWabaId,
      directPhoneId: testPhoneId,
    });

    expect(insertedWorkspaceId).toBe(workspaceAId);
  });

  // 9. Connection is stored against correct project
  it('9. Connection is stored against correct project', async () => {
    let insertedProjectId: string | undefined;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('INSERT INTO whatsapp_connections')) {
        insertedProjectId = values[1];
        return {
          rows: [
            {
              id: 'conn-1',
              workspace_id: values[0],
              project_id: values[1],
              waba_id: values[2],
              phone_number_id: values[3],
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    await projectConnectionService.connectProject({
      projectId: projectAId,
      workspaceId: workspaceAId,
      code: 'auth_code_1',
      appId: 'app_1',
      directWabaId: testWabaId,
      directPhoneId: testPhoneId,
    });

    expect(insertedProjectId).toBe(projectAId);
  });

  // 10. Access token is encrypted with AES-256-GCM
  it('10. Access token is encrypted with AES-256-GCM at rest', async () => {
    let storedCiphertext: string | undefined;
    let storedIv: string | undefined;
    let storedTag: string | undefined;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('INSERT INTO whatsapp_connections')) {
        // Values indices: 0: ws, 1: proj, 2: waba, 3: phone, 4: displayPhone, 5: verifiedName, 6: bizName, 7: status, 8: ciphertext, 9: iv, 10: tag
        storedCiphertext = values[8];
        storedIv = values[9];
        storedTag = values[10];

        return {
          rows: [
            {
              id: 'conn-1',
              workspace_id: values[0],
              project_id: values[1],
              waba_id: values[2],
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    await projectConnectionService.connectProject({
      projectId: projectAId,
      workspaceId: workspaceAId,
      code: 'auth_code_1',
      appId: 'app_1',
      directWabaId: testWabaId,
      directPhoneId: testPhoneId,
    });

    // Ciphertext must NOT be the raw token
    expect(storedCiphertext).toBeDefined();
    expect(storedCiphertext).not.toBe(testRawToken);
    expect(storedIv).toBeDefined();
    expect(storedTag).toBeDefined();

    // Verify it decrypts back to original token
    const decrypted = decrypt({
      ciphertext: storedCiphertext!,
      iv: storedIv!,
      tag: storedTag!,
    });
    expect(decrypted).toBe(testRawToken);
  });

  // 11. Access token is never returned to client
  it('11. Access token is never returned to client in GET API response', async () => {
    mockProjectAccess(true, 'OWNER');

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) return { rows: [{ id: userAId, email: 'userA@wazzi.com' }] };
      if (q.includes('FROM projects p')) {
        return { rows: [{ id: projectAId, workspace_id: workspaceAId, ws_id: workspaceAId, member_id: 'm-1', role: 'OWNER' }] };
      }
      if (q.includes('FROM whatsapp_connections')) {
        return {
          rows: [
            {
              id: 'conn-1',
              workspace_id: workspaceAId,
              project_id: projectAId,
              waba_id: testWabaId,
              phone_number_id: testPhoneId,
              display_phone_number: testDisplayPhone,
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
              encrypted_access_token: 'should_not_leak',
              token_iv: 'should_not_leak',
              token_tag: 'should_not_leak',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/whatsapp`);
    const res = await getProjectWhatsApp(req, { params: Promise.resolve({ id: projectAId }) });
    const json = await res.json();

    expect(json.data.encrypted_access_token).toBeUndefined();
    expect(json.data.token_iv).toBeUndefined();
    expect(json.data.token_tag).toBeUndefined();
    expect(json.data.accessToken).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain(testRawToken);
  });

  // 12. Duplicate connection is handled safely (upsert on project_id)
  it('12. Duplicate connection is handled safely via upsert without creating multiple connections per project', async () => {
    let conflictClausePresent = false;

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('ON CONFLICT (project_id) DO UPDATE')) {
        conflictClausePresent = true;
        return {
          rows: [
            {
              id: 'conn-existing',
              project_id: projectAId,
              workspace_id: workspaceAId,
              waba_id: testWabaId,
              status: 'CONNECTED',
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    await projectConnectionService.connectProject({
      projectId: projectAId,
      workspaceId: workspaceAId,
      code: 'reconnect_code',
      appId: 'app_1',
      directWabaId: testWabaId,
      directPhoneId: testPhoneId,
    });

    expect(conflictClausePresent).toBe(true);
  });

  // 13. Disconnect preserves historical data
  it('13. Disconnect preserves historical data and marks connection DISCONNECTED', async () => {
    mockProjectAccess(true, 'OWNER');

    let updateStatusQuery = false;
    let deleteQueryPresent = false;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM users')) return { rows: [{ id: userAId, email: 'userA@wazzi.com' }] };
      if (q.includes('FROM projects p')) {
        return { rows: [{ id: projectAId, workspace_id: workspaceAId, ws_id: workspaceAId, member_id: 'm-1', role: 'OWNER' }] };
      }
      if (q.includes('UPDATE whatsapp_connections') && q.includes("status = 'DISCONNECTED'")) {
        updateStatusQuery = true;
        return { rowCount: 1 };
      }
      if (q.includes('DELETE FROM')) {
        deleteQueryPresent = true;
      }
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/whatsapp/disconnect`, {
      method: 'POST',
    });

    const res = await disconnectProjectWhatsApp(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);
    expect(updateStatusQuery).toBe(true);
    expect(deleteQueryPresent).toBe(false); // No tables deleted
  });

  // 14. Invalid webhook request is rejected
  it('14. Invalid webhook request is rejected (bad verify token -> 403, bad HMAC -> 401)', async () => {
    // 14a. Invalid GET verification token
    const getReq = new NextRequest('http://localhost:3000/api/webhooks?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=112233');
    const getRes = await verifyWebhook(getReq);
    expect(getRes.status).toBe(403);

    // 14b. Valid GET verification token returns challenge
    const validGetReq = new NextRequest(`http://localhost:3000/api/webhooks?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=112233`);
    const validGetRes = await verifyWebhook(validGetReq);
    expect(validGetRes.status).toBe(200);
    const challengeText = await validGetRes.text();
    expect(challengeText).toBe('112233');

    // 14c. Invalid POST HMAC signature
    const postReq = new NextRequest('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': 'sha256=invalid_tampered_signature_hex_123',
      },
      body: JSON.stringify({ object: 'whatsapp_business_account' }),
    });
    const postRes = await receiveWebhook(postReq);
    expect(postRes.status).toBe(401);
  });

  // 15. Valid webhook is persisted in webhook_events
  it('15. Valid webhook is persisted in webhook_events', async () => {
    let insertedPayload: any = null;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM webhook_events') && q.includes('idempotency_hash')) {
        return { rows: [] }; // No duplicate
      }
      if (q.includes('INSERT INTO webhook_events')) {
        insertedPayload = values.find((v: any) => typeof v === 'string' && v.includes('wamid')) || values[5];
        return { rows: [{ id: 'webhook-evt-uuid-1' }] };
      }
      return { rows: [] };
    });

    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: testWabaId,
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: testPhoneId },
                messages: [{ id: 'wamid.HBgL12345678', text: { body: 'Hello!' } }],
              },
            },
          ],
        },
      ],
    });

    const validSig = 'sha256=' + crypto.createHmac('sha256', TEST_APP_SECRET).update(body).digest('hex');

    const req = new NextRequest('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: { 'x-hub-signature-256': validSig },
      body,
    });

    const res = await receiveWebhook(req);
    expect(res.status).toBe(200);
    expect(insertedPayload).toBeDefined();
    expect(insertedPayload).toContain('wamid.HBgL12345678');
  });

  // 16. Duplicate webhook is idempotent
  it('16. Duplicate webhook is idempotent and does not create duplicate jobs or duplicate DB records', async () => {
    let insertCount = 0;

    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM webhook_events') && q.includes('idempotency_hash')) {
        // Event already exists
        return { rows: [{ id: 'existing-event-id', status: 'processed' }] };
      }
      if (q.includes('INSERT INTO webhook_events')) {
        insertCount++;
        return { rows: [{ id: 'new-id' }] };
      }
      return { rows: [] };
    });

    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ id: testWabaId, changes: [{ field: 'messages', value: { messages: [{ id: 'wamid.DUPLICATE_TEST' }] } }] }],
    });

    const validSig = 'sha256=' + crypto.createHmac('sha256', TEST_APP_SECRET).update(body).digest('hex');

    const req = new NextRequest('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: { 'x-hub-signature-256': validSig },
      body,
    });

    const res = await receiveWebhook(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deduplicated).toBe(true);
    expect(insertCount).toBe(0);
    expect(testEnqueuedJobs).toHaveLength(0); // No new queue jobs dispatched
  });

  // 17. Webhook creates BullMQ job
  it('17. Webhook creates BullMQ job upon valid incoming event', async () => {
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM webhook_events') && q.includes('idempotency_hash')) return { rows: [] };
      if (q.includes('INSERT INTO webhook_events')) return { rows: [{ id: 'evt-bullmq-123' }] };
      return { rows: [] };
    });

    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: testWabaId,
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: testPhoneId },
                messages: [{ id: 'wamid.BULLMQ_TEST_MSG', text: { body: 'Inquire admissions' } }],
              },
            },
          ],
        },
      ],
    });

    const validSig = 'sha256=' + crypto.createHmac('sha256', TEST_APP_SECRET).update(body).digest('hex');

    const req = new NextRequest('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: { 'x-hub-signature-256': validSig },
      body,
    });

    const res = await receiveWebhook(req);
    expect(res.status).toBe(200);
    expect(testEnqueuedJobs.length).toBeGreaterThan(0);
    expect(testEnqueuedJobs[0].data.webhookEventId).toBe('evt-bullmq-123');
    expect(testEnqueuedJobs[0].data.externalEventId).toBe('wamid.BULLMQ_TEST_MSG');
  });

  // 18. Webhook returns quickly without running slow processing
  it('18. Webhook returns quickly without running slow synchronous processing', async () => {
    mockSql.mockImplementation(async (strings: any) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM webhook_events WHERE idempotency_hash')) return { rows: [] };
      if (q.includes('INSERT INTO webhook_events')) return { rows: [{ id: 'fast-event-id' }] };
      return { rows: [] };
    });

    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ id: testWabaId, changes: [{ field: 'messages', value: { messages: [{ id: 'wamid.FAST_123' }] } }] }],
    });

    const validSig = 'sha256=' + crypto.createHmac('sha256', TEST_APP_SECRET).update(body).digest('hex');

    const start = Date.now();
    const req = new NextRequest('http://localhost:3000/api/webhooks', {
      method: 'POST',
      headers: { 'x-hub-signature-256': validSig },
      body,
    });

    const res = await receiveWebhook(req);
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(1000); // Must be under 1s
  });

  // 19. Project A cannot access Project B's connection
  it('19. Project A cannot access Project B connection', async () => {
    // Both projects exist, but project B has a different connection
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM whatsapp_connections')) {
        const queryProj = values[0];
        if (queryProj === projectBId) {
          return {
            rows: [
              {
                id: 'conn-b',
                project_id: projectBId,
                workspace_id: workspaceAId,
                waba_id: 'waba_proj_b',
                phone_number_id: 'phone_proj_b',
                status: 'CONNECTED',
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        return { rows: [] };
      }
      return { rows: [] };
    });

    // Querying Project A's connection does NOT return Project B's connection
    const connA = await projectConnectionService.getProjectConnection(projectAId);
    expect(connA).toBeNull();

    const connB = await projectConnectionService.getProjectConnection(projectBId);
    expect(connB).not.toBeNull();
    expect(connB?.projectId).toBe(projectBId);
    expect(connB?.wabaId).toBe('waba_proj_b');
  });

  // 20. Workspace A cannot access Workspace B's connection
  it('20. Workspace A cannot access Workspace B connection', async () => {
    // User from Workspace A attempting to access Project in Workspace B
    mockProjectAccess(false, 'OWNER', workspaceBId, projectBId);

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectBId}/whatsapp`);
    const res = await getProjectWhatsApp(req, { params: Promise.resolve({ id: projectBId }) });
    expect(res.status).toBe(404);
  });
});
