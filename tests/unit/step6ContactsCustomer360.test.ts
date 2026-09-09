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
      fbAppSecret: 'fb_secret_step6',
      accessToken: 'EAAG_token_step6',
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

// Mock beUtils mock mode
vi.mock('@/app/api/mockData', () => ({
  isMockMode: vi.fn().mockReturnValue(false),
}));

// Imports
import { contactService, ContactNotFoundError } from '@/lib/services/contacts/contactService';
import { tagService } from '@/lib/services/contacts/tagService';
import { noteService } from '@/lib/services/contacts/noteService';
import { customFieldService } from '@/lib/services/contacts/customFieldService';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/services/contacts/phoneUtils';
import {
  testContactRealtimeEvents,
  clearTestContactRealtimeEvents,
} from '@/lib/realtime/ablyPublisher';

// API Route Handlers
import {
  GET as getContactsRoute,
  POST as createContactRoute,
} from '@/app/api/projects/[id]/contacts/route';
import {
  GET as getContactDetailsRoute,
  PATCH as updateContactRoute,
} from '@/app/api/projects/[id]/contacts/[contactId]/route';
import { POST as updateScoreRoute } from '@/app/api/projects/[id]/contacts/[contactId]/score/route';
import {
  GET as getNotesRoute,
  POST as addNoteRoute,
} from '@/app/api/projects/[id]/contacts/[contactId]/notes/route';
import {
  GET as getContactTagsRoute,
  POST as addContactTagRoute,
} from '@/app/api/projects/[id]/contacts/[contactId]/tags/route';
import { DELETE as removeContactTagRoute } from '@/app/api/projects/[id]/contacts/[contactId]/tags/[tagId]/route';
import { GET as getActivitiesRoute } from '@/app/api/projects/[id]/contacts/[contactId]/activities/route';
import { GET as getConversationsRoute } from '@/app/api/projects/[id]/contacts/[contactId]/conversations/route';
import {
  GET as getCustomFieldsRoute,
  PUT as updateCustomFieldsRoute,
} from '@/app/api/projects/[id]/contacts/[contactId]/custom-fields/route';
import {
  GET as getProjectTagsRoute,
  POST as createProjectTagRoute,
} from '@/app/api/projects/[id]/tags/route';

describe('STEP 6: Contacts + Customer 360', () => {
  // Test Identifiers
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userViewerId = '22222222-2222-2222-2222-222222222222';
  const outsiderUserId = '99999999-9999-9999-9999-999999999999';

  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const workspaceBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const projectAId = 'project-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectBId = 'project-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const contactAId = 'contact-aaaa-1111-1111-111111111111';
  const contactBId = 'contact-bbbb-2222-2222-222222222222';

  const tagAId = 'tag-aaaa-1111-1111-111111111111';
  const tagBId = 'tag-bbbb-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestContactRealtimeEvents();
    mockAuth0Session.mockReset();
    mockMetaGraphPost.mockReset();
    mockSql.mockImplementation(async () => ({ rows: [] as any[] }));

    // Default: Authenticated as User A (Admin / Owner)
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
    role?: string;
    projectId?: string;
    workspaceId?: string;
  }) {
    const {
      authorized,
      userId = userAId,
      role = 'OWNER',
      projectId = projectAId,
      workspaceId = workspaceAId,
    } = opts;

    return (q: string, values: any[]) => {
      // 1. User lookup for session sync
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
              avatar_url: null,
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

      return null;
    };
  }

  // ── TEST 1: Authorized user can list contacts ──────────────────────────
  it('1. Authorized user can list contacts', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('COUNT(*)::int as total')) {
        return { rows: [{ total: 1 }] };
      }

      if (q.includes('FROM contacts c') && q.includes('LEFT JOIN contact_tags')) {
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              wa_id: '15551234567',
              phone_number: '15551234567',
              first_name: 'Alice',
              last_name: 'Smith',
              display_name: 'Alice Smith',
              email: 'alice@example.com',
              company: 'Acme Corp',
              status: 'ACTIVE',
              lead_score: 85,
              source: 'MANUAL',
              last_activity_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tags: [{ id: tagAId, name: 'VIP', color: '#1b59f8' }],
            },
          ],
        };
      }

      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;

      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/contacts`);
    const res = await getContactsRoute(req, { params: Promise.resolve({ id: projectAId }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data).toHaveLength(1);
    expect(json.data[0].displayName).toBe('Alice Smith');
    expect(json.totalCount).toBe(1);
  });

  // ── TEST 2: Unauthorized user cannot list contacts ──────────────────────
  it('2. Unauthorized user cannot list contacts', async () => {
    mockAuth0Session.mockResolvedValue(null);

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectAId}/contacts`);
    const res = await getContactsRoute(req, { params: Promise.resolve({ id: projectAId }) });

    expect(res.status).toBe(401);
  });

  // ── TEST 3: Workspace A cannot access Workspace B contacts ─────────────
  it('3. Workspace A cannot access Workspace B contacts', async () => {
    // User is in Workspace A, trying to access Project B in Workspace B
    const authHandler = setupProjectAuth({
      authorized: false, // User not in project B
      projectId: projectBId,
      workspaceId: workspaceBId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${projectBId}/contacts`);
    const res = await getContactsRoute(req, { params: Promise.resolve({ id: projectBId }) });

    // Non-disclosing 404
    expect(res.status).toBe(404);
  });

  // ── TEST 4: Project A cannot access Project B contacts ──────────────────
  it('4. Project A cannot access Project B contacts', async () => {
    // Contact belongs to Project B
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts c') && q.includes('WHERE c.id =')) {
        // Query filters by workspaceId AND projectId. Return empty if requested with project A
        const queriedProjId = values[2] || values[1];
        if (queriedProjId === projectAId) {
          return { rows: [] };
        }
        return { rows: [{ id: contactBId, project_id: projectBId }] };
      }

      return { rows: [] };
    });

    await expect(
      contactService.getContactById(workspaceAId, projectAId, contactBId),
    ).rejects.toThrow(ContactNotFoundError);
  });

  // ── TEST 5: Contact ID cannot bypass project authorization ─────────────
  it('5. Contact ID cannot bypass project authorization', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Contact does not belong to Project A
      if (q.includes('FROM contacts c') && q.includes('WHERE c.id =')) {
        return { rows: [] };
      }

      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactBId}`,
    );
    const res = await getContactDetailsRoute(req, {
      params: Promise.resolve({ id: projectAId, contactId: contactBId }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Contact not found');
  });

  // ── TEST 6: Contact creation associates correct workspace ───────────────
  it('6. Contact creation associates correct workspace', async () => {
    let insertedWorkspaceId = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts c') && q.includes('c.project_id =')) {
        return { rows: [] }; // No duplicate
      }

      if (q.includes('INSERT INTO contacts')) {
        insertedWorkspaceId = values[0];
        return {
          rows: [
            {
              id: 'new-contact-01',
              workspace_id: values[0],
              project_id: values[1],
              wa_id: values[2],
              phone_number: values[3],
              display_name: values[6],
              lead_score: 50,
              status: 'ACTIVE',
              source: 'MANUAL',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      return { rows: [] };
    });

    const created = await contactService.createContact({
      workspaceId: workspaceAId,
      projectId: projectAId,
      phone: '+1 (555) 234-5678',
      displayName: 'Bob Jones',
    });

    expect(insertedWorkspaceId).toBe(workspaceAId);
    expect(created.workspaceId).toBe(workspaceAId);
  });

  // ── TEST 7: Contact creation associates correct project ─────────────────
  it('7. Contact creation associates correct project', async () => {
    let insertedProjectId = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts c') && q.includes('c.project_id =')) {
        return { rows: [] }; // No duplicate
      }

      if (q.includes('INSERT INTO contacts')) {
        insertedProjectId = values[1];
        return {
          rows: [
            {
              id: 'new-contact-02',
              workspace_id: values[0],
              project_id: values[1],
              wa_id: values[2],
              phone_number: values[3],
              display_name: values[6],
              lead_score: 50,
              status: 'ACTIVE',
              source: 'MANUAL',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      return { rows: [] };
    });

    const created = await contactService.createContact({
      workspaceId: workspaceAId,
      projectId: projectAId,
      phone: '+1 (555) 345-6789',
      displayName: 'Charlie Green',
    });

    expect(insertedProjectId).toBe(projectAId);
    expect(created.projectId).toBe(projectAId);
  });

  // ── TEST 8: Contact cannot change workspace_id through update ───────────
  it('8. Contact cannot change workspace_id through update', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let updateQueryExecuted = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts') && q.includes('WHERE id =')) {
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              phone_number: '15551234567',
              display_name: 'Alice',
              lead_score: 50,
              status: 'ACTIVE',
            },
          ],
        };
      }

      if (q.includes('UPDATE contacts') && q.includes('SET')) {
        updateQueryExecuted = q;
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId, // Stays workspace A
              project_id: projectAId,
              phone_number: '15551234567',
              display_name: 'Alice Renamed',
              lead_score: 50,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    // Malicious attempt: send workspace_id in payload
    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Alice Renamed',
          workspace_id: workspaceBId,
        }),
      },
    );

    const res = await updateContactRoute(req, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });

    expect(res.status).toBe(200);
    // Verified: UPDATE SET clause does not contain workspace_id
    const setClause = updateQueryExecuted.split(/WHERE/i)[0];
    expect(setClause).not.toContain('workspace_id');
  });

  // ── TEST 9: Contact cannot change project_id through update ─────────────
  it('9. Contact cannot change project_id through update', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });
    let updateQueryExecuted = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts') && q.includes('WHERE id =')) {
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              phone_number: '15551234567',
              display_name: 'Alice',
              lead_score: 50,
              status: 'ACTIVE',
            },
          ],
        };
      }

      if (q.includes('UPDATE contacts') && q.includes('SET')) {
        updateQueryExecuted = q;
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId,
              project_id: projectAId, // Stays project A
              phone_number: '15551234567',
              display_name: 'Alice Renamed',
              lead_score: 50,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Alice Renamed',
          project_id: projectBId,
        }),
      },
    );

    const res = await updateContactRoute(req, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });

    expect(res.status).toBe(200);
    // Verified: UPDATE SET clause does not contain project_id
    const setClause = updateQueryExecuted.split(/WHERE/i)[0];
    expect(setClause).not.toContain('project_id');
  });

  // ── TEST 10: Duplicate WhatsApp phone is handled correctly ──────────────
  it('10. Duplicate WhatsApp phone is handled correctly', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Simulate existing contact found with normalized phone
      if (q.includes('FROM contacts c') && q.includes('c.project_id =')) {
        return {
          rows: [{ id: 'existing-contact-123', display_name: 'Duplicate Contact' }],
        };
      }

      return { rows: [] };
    });

    await expect(
      contactService.createContact({
        workspaceId: workspaceAId,
        projectId: projectAId,
        phone: '+1 555 123 4567',
        displayName: 'New Duplicate Attempt',
      }),
    ).rejects.toThrow(/already exists in this project/);
  });

  // ── TEST 11: WhatsApp inbound creates contact when missing ──────────────
  it('11. WhatsApp inbound creates contact when missing', async () => {
    let contactInserted = false;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Check existing -> Not found
      if (q.includes('FROM contacts c') && q.includes('c.project_id =')) {
        return { rows: [] };
      }

      // Insert contact
      if (q.includes('INSERT INTO contacts')) {
        contactInserted = true;
        return {
          rows: [
            {
              id: 'inbound-contact-01',
              workspace_id: workspaceAId,
              project_id: projectAId,
              wa_id: '15559998888',
              phone_number: '15559998888',
              display_name: 'Inbound Student',
              source: 'WHATSAPP',
              status: 'ACTIVE',
              lead_score: 50,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      return { rows: [] };
    });

    const contact = await contactService.findOrCreateWhatsAppContact({
      workspaceId: workspaceAId,
      projectId: projectAId,
      waId: '15559998888',
      profileName: 'Inbound Student',
    });

    expect(contactInserted).toBe(true);
    expect(contact.id).toBe('inbound-contact-01');
    expect(contact.source).toBe('WHATSAPP');
    expect(contact.phoneNumber).toBe('15559998888');

    // Emitted contact.created realtime event
    const event = testContactRealtimeEvents.find((e) => e.name === 'contact.created');
    expect(event).toBeDefined();
    expect(event?.channel).toBe(`workspace:${workspaceAId}:project:${projectAId}:contacts`);
  });

  // ── TEST 12: Existing WhatsApp contact is reused ─────────────────────────
  it('12. Existing WhatsApp contact is reused', async () => {
    let insertCount = 0;
    let updateCount = 0;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Check existing -> Found!
      if (q.includes('FROM contacts c') && q.includes('c.project_id =')) {
        return {
          rows: [
            {
              id: 'existing-contact-999',
              workspace_id: workspaceAId,
              project_id: projectAId,
              wa_id: '15559998888',
              phone_number: '15559998888',
              display_name: 'Existing Customer',
              source: 'WHATSAPP',
              status: 'ACTIVE',
              lead_score: 75,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (q.includes('UPDATE contacts') && q.includes('last_activity_at = CURRENT_TIMESTAMP')) {
        updateCount++;
        return { rows: [] };
      }

      if (q.includes('INSERT INTO contacts')) {
        insertCount++;
        return { rows: [] };
      }

      return { rows: [] };
    });

    const contact = await contactService.findOrCreateWhatsAppContact({
      workspaceId: workspaceAId,
      projectId: projectAId,
      waId: '15559998888',
      profileName: 'Existing Customer',
    });

    expect(contact.id).toBe('existing-contact-999');
    expect(insertCount).toBe(0); // No duplicate contact created
    expect(updateCount).toBe(1); // Activity timestamp refreshed
  });

  // ── TEST 13: Contact tags are tenant/project scoped ─────────────────────
  it('13. Contact tags are tenant/project scoped', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('SELECT id FROM contacts')) {
        return { rows: [{ id: contactAId }] };
      }

      // Check tag: tag B belongs to project B, so not found in project A
      if (q.includes('SELECT id, name FROM tags')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    await expect(
      tagService.addTagToContact(workspaceAId, projectAId, contactAId, tagBId),
    ).rejects.toThrow(/Tag not found or does not belong to this project/);
  });

  // ── TEST 14: Notes are tenant/project scoped ────────────────────────────
  it('14. Notes are tenant/project scoped', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('SELECT id FROM contacts')) {
        return { rows: [{ id: contactAId }] };
      }

      if (q.includes('FROM contact_notes cn')) {
        // Query must scope by workspace_id AND project_id
        expect(q).toContain('cn.workspace_id =');
        expect(q).toContain('cn.project_id =');
        return {
          rows: [
            {
              id: 'note-01',
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: contactAId,
              author_user_id: userAId,
              content: 'Private customer note',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              author_name: 'User A',
              author_email: 'userA@wazzi.com',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const notes = await noteService.getContactNotes(workspaceAId, projectAId, contactAId);
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe('Private customer note');
  });

  // ── TEST 15: Notes cannot be sent to WhatsApp ───────────────────────────
  it('15. Notes cannot be sent to WhatsApp', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('SELECT id FROM contacts')) {
        return { rows: [{ id: contactAId }] };
      }

      if (q.includes('INSERT INTO contact_notes')) {
        return {
          rows: [
            {
              id: 'note-123',
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: contactAId,
              author_user_id: userAId,
              content: 'Customer is inquiring about pricing plans',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }

      return { rows: [] };
    });

    const note = await noteService.addContactNote({
      workspaceId: workspaceAId,
      projectId: projectAId,
      contactId: contactAId,
      authorUserId: userAId,
      content: 'Customer is inquiring about pricing plans',
    });

    expect(note.id).toBe('note-123');
    // Meta Graph client is never called for internal notes
    expect(mockMetaGraphPost).not.toHaveBeenCalled();
  });

  // ── TEST 16: Custom fields are tenant/project scoped ────────────────────
  it('16. Custom fields are tenant/project scoped', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      // Check definition in project: not found because definition belongs to another project
      if (q.includes('SELECT id, type, required FROM custom_field_definitions')) {
        return { rows: [] as any[] };
      }

      return { rows: [] };
    });

    await expect(
      customFieldService.setFieldValueForContact(
        workspaceAId,
        projectAId,
        contactAId,
        'def-foreign-proj-id',
        'test value',
      ),
    ).rejects.toThrow(/Custom field definition does not belong to this project/);
  });

  // ── TEST 17: Lead score remains within 0–100 ────────────────────────────
  it('17. Lead score remains within 0–100', async () => {
    const authHandler = setupProjectAuth({ authorized: true, projectId: projectAId });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    // Score > 100
    const reqHigh = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}/score`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 150 }),
      },
    );
    const resHigh = await updateScoreRoute(reqHigh, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });
    expect(resHigh.status).toBe(400);

    // Score < 0
    const reqLow = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}/score`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: -10 }),
      },
    );
    const resLow = await updateScoreRoute(reqLow, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });
    expect(resLow.status).toBe(400);
  });

  // ── TEST 18: Lead score changes are recorded ────────────────────────────
  it('18. Lead score changes are recorded', async () => {
    let activityInserted = false;
    const recordedActivities: string[] = [];

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts') && q.includes('WHERE id =')) {
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              phone_number: '15551234567',
              lead_score: 50,
            },
          ],
        };
      }

      if (q.includes('UPDATE contacts') && q.includes('SET')) {
        return {
          rows: [
            {
              id: contactAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              phone_number: '15551234567',
              lead_score: 90,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (q.includes('INSERT INTO contact_activities')) {
        activityInserted = true;
        if (q.includes('LEAD_SCORE_CHANGED')) {
          recordedActivities.push('LEAD_SCORE_CHANGED');
        } else if (q.includes('CONTACT_UPDATED')) {
          recordedActivities.push('CONTACT_UPDATED');
        } else {
          recordedActivities.push(String(values[3] || 'UNKNOWN'));
        }
        return { rows: [] };
      }

      return { rows: [] };
    });

    await contactService.updateContact({
      workspaceId: workspaceAId,
      projectId: projectAId,
      contactId: contactAId,
      leadScore: 90,
    });

    expect(activityInserted).toBe(true);
    expect(recordedActivities).toContain('LEAD_SCORE_CHANGED');

    // Emitted score updated realtime event
    const scoreEvent = testContactRealtimeEvents.find((e) => e.name === 'contact.score.updated');
    expect(scoreEvent).toBeDefined();
    expect(scoreEvent?.data.oldScore).toBe(50);
    expect(scoreEvent?.data.newScore).toBe(90);
  });

  // ── TEST 19: Search is tenant/project scoped ────────────────────────────
  it('19. Search is tenant/project scoped', async () => {
    let capturedQuery = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      if (q.includes('FROM contacts c') && q.includes('LEFT JOIN contact_tags')) {
        capturedQuery = q;
        return { rows: [] };
      }
      if (q.includes('COUNT(*)::int as total')) {
        return { rows: [{ total: 0 }] };
      }
      return { rows: [] };
    });

    await contactService.getContacts({
      workspaceId: workspaceAId,
      projectId: projectAId,
      search: 'Alice',
    });

    expect(capturedQuery).toContain('c.workspace_id =');
    expect(capturedQuery).toContain('c.project_id =');
    expect(capturedQuery).toContain('display_name');
  });

  // ── TEST 20: Pagination works ───────────────────────────────────────────
  it('20. Pagination works', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('COUNT(*)::int as total')) {
        return { rows: [{ total: 35 }] };
      }

      if (q.includes('FROM contacts c') && q.includes('LEFT JOIN contact_tags')) {
        return {
          rows: Array.from({ length: 10 }, (_, i) => ({
            id: `contact-page-${i}`,
            workspace_id: workspaceAId,
            project_id: projectAId,
            phone_number: `1555000000${i}`,
            display_name: `Contact ${i}`,
            lead_score: 50,
            status: 'ACTIVE',
            source: 'MANUAL',
            last_activity_at: new Date(Date.now() - i * 60000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: [] as any[],
          })),
        };
      }

      return { rows: [] };
    });

    const result = await contactService.getContacts({
      workspaceId: workspaceAId,
      projectId: projectAId,
      limit: 10,
      offset: 0,
    });

    expect(result.contacts).toHaveLength(10);
    expect(result.totalCount).toBe(35);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();
  });

  // ── TEST 21: Conversation history is tenant/project scoped ──────────────
  it('21. Conversation history is tenant/project scoped', async () => {
    let capturedConvQuery = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('SELECT id FROM contacts')) {
        return { rows: [{ id: contactAId }] };
      }

      if (q.includes('FROM conversations c')) {
        capturedConvQuery = q;
        return {
          rows: [
            {
              id: 'conv-01',
              status: 'open',
              channel: 'whatsapp',
              handling_mode: 'AI_HANDLING',
              priority: 'medium',
              last_message_at: new Date().toISOString(),
              last_message_preview: 'Hello',
              unread_count: 0,
              assigned_user_id: userAId,
              assigned_user_name: 'Agent A',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const convs = await contactService.getContactConversations(workspaceAId, projectAId, contactAId);
    expect(convs).toHaveLength(1);
    expect(capturedConvQuery).toContain('c.workspace_id =');
    expect(capturedConvQuery).toContain('c.project_id =');
    expect(capturedConvQuery).toContain('c.contact_id =');
  });

  // ── TEST 22: Unauthorized user cannot edit contact ──────────────────────
  it('22. Unauthorized user cannot edit contact', async () => {
    // Viewer role does not have PERMISSIONS.CONTACTS_MANAGE
    const authHandler = setupProjectAuth({
      authorized: true,
      userId: userViewerId,
      role: 'VIEWER',
      projectId: projectAId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Unauthorized Edit' }),
      },
    );

    const res = await updateContactRoute(req, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });

    expect(res.status).toBe(403);
  });

  // ── TEST 23: Unauthorized user cannot add notes ─────────────────────────
  it('23. Unauthorized user cannot add notes', async () => {
    const authHandler = setupProjectAuth({
      authorized: true,
      userId: userViewerId,
      role: 'VIEWER',
      projectId: projectAId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Unauthorized note' }),
      },
    );

    const res = await addNoteRoute(req, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });

    expect(res.status).toBe(403);
  });

  // ── TEST 24: Unauthorized user cannot change tags ───────────────────────
  it('24. Unauthorized user cannot change tags', async () => {
    const authHandler = setupProjectAuth({
      authorized: true,
      userId: userViewerId,
      role: 'VIEWER',
      projectId: projectAId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');
      const authRes = authHandler(q, values);
      if (authRes !== null) return authRes;
      return { rows: [] };
    });

    const req = new NextRequest(
      `http://localhost:3000/api/projects/${projectAId}/contacts/${contactAId}/tags`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: tagAId }),
      },
    );

    const res = await addContactTagRoute(req, {
      params: Promise.resolve({ id: projectAId, contactId: contactAId }),
    });

    expect(res.status).toBe(403);
  });

  // ── TEST 25: Realtime events are tenant/project scoped ──────────────────
  it('25. Realtime events are tenant/project scoped', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('FROM contacts c') && q.includes('c.project_id =')) {
        return { rows: [] };
      }

      if (q.includes('INSERT INTO contacts')) {
        return {
          rows: [
            {
              id: 'rt-contact-01',
              workspace_id: workspaceAId,
              project_id: projectAId,
              wa_id: '15554443322',
              phone_number: '15554443322',
              display_name: 'Realtime Contact',
              lead_score: 50,
              status: 'ACTIVE',
              source: 'MANUAL',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            },
          ],
        };
      }

      return { rows: [] };
    });

    await contactService.createContact({
      workspaceId: workspaceAId,
      projectId: projectAId,
      phone: '+1 555 444 3322',
      displayName: 'Realtime Contact',
    });

    const createdEvent = testContactRealtimeEvents.find((e) => e.name === 'contact.created');
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.channel).toBe(`workspace:${workspaceAId}:project:${projectAId}:contacts`);
  });

  // ── TEST 26: No fake contacts are created ───────────────────────────────
  it('26. No fake contacts are created', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = Array.isArray(strings) ? strings.join('') : String(strings || '');

      if (q.includes('COUNT(*)::int as total')) {
        return { rows: [{ total: 0 }] };
      }

      if (q.includes('FROM contacts c')) {
        return { rows: [] }; // Truly empty database
      }

      return { rows: [] };
    });

    const result = await contactService.getContacts({
      workspaceId: workspaceAId,
      projectId: projectAId,
    });

    expect(result.contacts).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
