import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted SQL & Mocks ───────────────────────────────────────────────────
const { mockSql, sqlMockObj } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] as any[] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });
  return {
    mockSql: mockFn,
    sqlMockObj: obj,
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

// Mock beUtils mock mode
vi.mock('@/app/api/mockData', () => ({
  isMockMode: vi.fn().mockReturnValue(false),
}));

// Imports
import { agentService } from '@/lib/services/ai/agentService';
import { AIProviderFactory } from '@/lib/ai/providers/aiProviderFactory';
import { OpenAIProvider } from '@/lib/ai/providers/openAiProvider';
import { AIOrchestrator } from '@/lib/ai/aiOrchestrator';
import { testEnqueuedAiJobs, clearTestAiJobs, enqueueAiMessage } from '@/lib/queue/aiMessageQueue';
import { processAiJob } from '@/lib/queue/aiWorker';
import { testAiRealtimeEvents, clearTestAiRealtimeEvents } from '@/lib/realtime/ablyPublisher';

// API Route Handlers
import { GET as getAgentsRoute, POST as createAgentRoute } from '@/app/api/projects/[id]/ai/agents/route';
import {
  GET as getAgentRoute,
  PATCH as updateDraftRoute,
  DELETE as archiveAgentRoute,
} from '@/app/api/projects/[id]/ai/agents/[agentId]/route';
import { POST as publishAgentRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/publish/route';
import { POST as activateAgentRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/activate/route';
import { POST as pauseAgentRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/pause/route';
import { POST as duplicateAgentRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/duplicate/route';
import { POST as rollbackAgentRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/rollback/route';
import { POST as testAgentRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/test/route';
import { GET as getVersionsRoute } from '@/app/api/projects/[id]/ai/agents/[agentId]/versions/route';
import { POST as previewTestRoute } from '@/app/api/projects/[id]/ai/agents/preview-test/route';

describe('STEP 7: AI Agent Studio', () => {
  // Test Identifiers
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userViewerId = '22222222-2222-2222-2222-222222222222';
  const workspaceAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const workspaceBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const projectAId = 'project-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectBId = 'project-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const agentAId = 'agent-aaaa-1111-1111-111111111111';
  const version1Id = 'version-1111-1111-1111-111111111111';
  const version2Id = 'version-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestAiRealtimeEvents();
    clearTestAiJobs();
    OpenAIProvider.setTestMockHandler(null);
    mockAuth0Session.mockReset();
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
      // 1. User lookup
      if (q.includes('FROM users') && (q.includes('auth0_user_id') || q.includes('email'))) {
        return {
          rows: [
            {
              id: userId,
              auth0_user_id: `auth0|${userId}`,
              email: `${userId}@wazzi.com`,
              name: `User ${userId}`,
              role: 'client',
              is_super_admin: false,
              status: 'active',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-01'),
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

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Authorization & Multi-Tenancy
  // ══════════════════════════════════════════════════════════════════════════

  it('1. Unauthenticated request to AI agent routes returns 401', async () => {
    mockAuth0Session.mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents`);
    const res = await getAgentsRoute(req, { params: Promise.resolve({ id: projectAId }) });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(json.error).toMatch(/authentication required/i);
  });

  it('2. User without project access cannot access AI agents (404/403)', async () => {
    const authHandler = setupProjectAuth({ authorized: false, projectId: projectAId });
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      const auth = authHandler(q, values);
      if (auth) return auth;
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents`);
    const res = await getAgentsRoute(req, { params: Promise.resolve({ id: projectAId }) });

    expect(res.status).toBe(404);
  });

  it('3. Workspace isolation: Query in Workspace A filters strictly by workspace_id', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents')) {
        expect(values).toContain(workspaceAId);
        expect(values).not.toContain(workspaceBId);
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              name: 'Support Bot A',
              slug: 'support-bot-a',
              status: 'ACTIVE',
              handling_mode: 'AI_HANDLING',
            },
          ],
        };
      }
      if (q.includes('COUNT(*)')) {
        return { rows: [{ count: '1' }] };
      }
      return { rows: [] };
    });

    const result = await agentService.getAgents({
      workspaceId: workspaceAId,
      projectId: projectAId,
    });

    expect(result.agents.length).toBe(1);
    expect(result.agents[0].workspaceId).toBe(workspaceAId);
  });

  it('4. Role permissions: VIEWER role cannot create or publish an agent', async () => {
    const authHandler = setupProjectAuth({
      authorized: true,
      role: 'VIEWER',
      projectId: projectAId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      const auth = authHandler(q, values);
      if (auth) return auth;
      return { rows: [] };
    });

    // Attempt create as VIEWER
    const createReq = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Forbidden Bot',
        role: 'Assistant',
        systemInstructions: 'Help users',
      }),
    });
    const createRes = await createAgentRoute(createReq, { params: Promise.resolve({ id: projectAId }) });
    expect(createRes.status).toBe(403);

    // Attempt publish as VIEWER
    const pubReq = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents/${agentAId}/publish`, {
      method: 'POST',
    });
    const pubRes = await publishAgentRoute(pubReq, {
      params: Promise.resolve({ id: projectAId, agentId: agentAId }),
    });
    expect(pubRes.status).toBe(403);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: AI Agent CRUD & Draft Management
  // ══════════════════════════════════════════════════════════════════════════

  it('5. Create AI agent creates agent with DRAFT status and initial draft version (version 1)', async () => {
    let insertedAgent: any = null;
    let insertedVersion: any = null;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('INSERT INTO ai_agents')) {
        insertedAgent = {
          id: agentAId,
          workspace_id: values[0],
          project_id: values[1],
          name: values[2],
          slug: values[3],
          description: values[4],
          status: values[5],
          handling_mode: values[6],
          created_by: values[7],
          created_at: new Date(),
          updated_at: new Date(),
        };
        return { rows: [insertedAgent] };
      }
      if (q.includes('INSERT INTO ai_agent_versions')) {
        insertedVersion = {
          id: version1Id,
          agent_id: values[0],
          version_number: values[3],
          status: values[4],
          role: values[5],
          system_instructions: values[6],
          tone: values[7],
          language: values[8],
          greeting_message: values[9],
          fallback_message: values[10],
          model: values[16],
          provider: values[17],
        };
        return { rows: [insertedVersion] };
      }
      if (q.includes('INSERT INTO audit_logs')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const agent = await agentService.createAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      name: 'Sales Concierge',
      role: 'Sales Representative',
      systemInstructions: 'Answer product questions and close leads.',
      tone: 'Friendly',
      model: 'gpt-4o-mini',
      provider: 'openai',
      userId: userAId,
    });

    expect(insertedAgent).not.toBeNull();
    expect(insertedAgent.status).toBe('DRAFT');
    expect(insertedAgent.slug).toBe('sales-concierge');
    expect(insertedVersion).not.toBeNull();
    expect(insertedVersion.version_number).toBe(1);
    expect(insertedVersion.status).toBe('DRAFT');
    expect(agent.draftVersion.role).toBe('Sales Representative');
  });

  it('6. Stable slug generation converts name cleanly and handles collisions', async () => {
    let slugUsed = '';
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('INSERT INTO ai_agents')) {
        slugUsed = values[3];
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: values[0],
              project_id: values[1],
              name: values[2],
              slug: slugUsed,
              status: 'DRAFT',
            },
          ],
        };
      }
      if (q.includes('INSERT INTO ai_agent_versions')) {
        return { rows: [{ id: version1Id, version_number: 1, status: 'DRAFT' }] };
      }
      return { rows: [] };
    });

    await agentService.createAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      name: 'Customer Support 24/7 & More!',
      role: 'Support',
      systemInstructions: 'Help customers',
      userId: userAId,
    });

    expect(slugUsed).toBe('customer-support-24-7-more');
  });

  it('7. Update draft updates draft version fields without altering published version', async () => {
    let updatedVersionFields: any = null;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      // getAgentById check
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              name: 'Support Bot',
              status: 'ACTIVE',
              current_version_id: version1Id,
            },
          ],
        };
      }
      // find existing draft
      if (q.includes('FROM ai_agent_versions') && q.includes("status = 'DRAFT'")) {
        return {
          rows: [
            {
              id: version2Id,
              agent_id: agentAId,
              version_number: 2,
              status: 'DRAFT',
              role: 'Old Draft Role',
            },
          ],
        };
      }
      // update draft version
      if (q.includes('UPDATE ai_agent_versions')) {
        updatedVersionFields = {
          role: values[0],
          instructions: values[1],
        };
        return {
          rows: [
            {
              id: version2Id,
              agent_id: agentAId,
              version_number: 2,
              status: 'DRAFT',
              role: values[0],
              system_instructions: values[1],
            },
          ],
        };
      }
      if (q.includes('UPDATE ai_agents')) {
        return { rows: [{ id: agentAId, name: 'Support Bot Updated' }] };
      }
      return { rows: [] };
    });

    await agentService.updateDraft({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      role: 'Updated Senior Specialist',
      systemInstructions: 'Brand new instructions for draft v2',
      userId: userAId,
    });

    expect(updatedVersionFields.role).toBe('Updated Senior Specialist');
    expect(updatedVersionFields.instructions).toBe('Brand new instructions for draft v2');
  });

  it('8. Duplicate agent clones configuration into a new draft agent', async () => {
    let clonedAgentName = '';
    let clonedVersionRole = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              name: 'Original Agent',
              description: 'Original Desc',
              handling_mode: 'HYBRID',
              current_version_id: version1Id,
            },
          ],
        };
      }
      if (q.includes('FROM ai_agent_versions') && q.includes('WHERE id =')) {
        return {
          rows: [
            {
              id: version1Id,
              role: 'Original Specialist',
              system_instructions: 'Original instructions',
              tone: 'Concise',
              model: 'gpt-4o',
              provider: 'openai',
            },
          ],
        };
      }
      if (q.includes('INSERT INTO ai_agents')) {
        clonedAgentName = values[2];
        return {
          rows: [
            {
              id: 'new-cloned-agent-id',
              name: clonedAgentName,
              status: 'DRAFT',
            },
          ],
        };
      }
      if (q.includes('INSERT INTO ai_agent_versions')) {
        clonedVersionRole = values[5];
        return {
          rows: [
            {
              id: 'new-cloned-version-id',
              role: clonedVersionRole,
              version_number: 1,
              status: 'DRAFT',
            },
          ],
        };
      }
      return { rows: [] };
    });

    await agentService.duplicateAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      userId: userAId,
    });

    expect(clonedAgentName).toBe('Original Agent (Copy)');
    expect(clonedVersionRole).toBe('Original Specialist');
  });

  it('9. Archive agent sets status to ARCHIVED and sets archived_at', async () => {
    let archivedStatus = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              status: 'ACTIVE',
            },
          ],
        };
      }
      if (q.includes('UPDATE ai_agents') && q.includes("status = 'ARCHIVED'")) {
        archivedStatus = 'ARCHIVED';
        return { rows: [] };
      }
      return { rows: [] };
    });

    await agentService.archiveAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      userId: userAId,
    });

    expect(archivedStatus).toBe('ARCHIVED');
    expect(testAiRealtimeEvents.some((e) => e.event === 'agent.archived')).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Versioning, Publishing & Rollback
  // ══════════════════════════════════════════════════════════════════════════

  it('10. Publishing draft fails if required fields are missing', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              name: 'Incomplete Bot',
            },
          ],
        };
      }
      if (q.includes('FROM ai_agent_versions') && q.includes("status = 'DRAFT'")) {
        return {
          rows: [
            {
              id: version1Id,
              agent_id: agentAId,
              role: '', // Empty role!
              system_instructions: 'Valid instructions',
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      agentService.publishVersion({
        workspaceId: workspaceAId,
        projectId: projectAId,
        agentId: agentAId,
        userId: userAId,
      }),
    ).rejects.toThrow(/role is required/i);
  });

  it('11. Publishing draft marks version as PUBLISHED, archives previous version, sets current_version_id and status ACTIVE', async () => {
    let publishedVersionId = '';
    let agentUpdatedStatus = '';
    let agentCurrentVersionId = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              name: 'Support Bot',
              status: agentUpdatedStatus || 'DRAFT',
              current_version_id: agentCurrentVersionId || version1Id,
            },
          ],
        };
      }
      // Draft lookup
      if (q.includes('FROM ai_agent_versions') && q.includes("status = 'DRAFT'")) {
        return {
          rows: [
            {
              id: version2Id,
              agent_id: agentAId,
              version_number: 2,
              status: 'DRAFT',
              role: 'Tier 2 Specialist',
              system_instructions: 'Provide expert assistance',
              tone: 'Professional',
              language: 'English',
              model: 'gpt-4o-mini',
              provider: 'openai',
              temperature: 0.3,
            },
          ],
        };
      }
      // Archive previous version
      if (q.includes("SET status = 'ARCHIVED'")) {
        return { rows: [] };
      }
      // Mark draft as published
      if (q.includes("SET status = 'PUBLISHED'")) {
        publishedVersionId = values[0];
        return {
          rows: [
            {
              id: version2Id,
              agent_id: agentAId,
              version_number: 2,
              status: 'PUBLISHED',
              role: 'Tier 2 Specialist',
            },
          ],
        };
      }
      // Update agent active & current_version_id
      if (q.includes('UPDATE ai_agents') && q.includes('current_version_id =')) {
        agentCurrentVersionId = values[0];
        agentUpdatedStatus = 'ACTIVE';
        return {
          rows: [
            {
              id: agentAId,
              status: 'ACTIVE',
              current_version_id: agentCurrentVersionId,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const published = await agentService.publishVersion({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      userId: userAId,
    });

    expect(published.status).toBe('ACTIVE');
    expect(agentUpdatedStatus).toBe('ACTIVE');
    expect(agentCurrentVersionId).toBe(version2Id);
    expect(testAiRealtimeEvents.some((e) => e.event === 'agent.published')).toBe(true);
  });

  it('12. Published versions are immutable: updating draft when only published version exists forks a new draft version', async () => {
    let createdNewDraft = false;
    let newDraftVersionNumber = 0;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              status: 'ACTIVE',
              current_version_id: version1Id,
            },
          ],
        };
      }
      // No existing draft version initially, but return newly created draft after insertion
      if (q.includes('FROM ai_agent_versions') && q.includes("status = 'DRAFT'")) {
        if (createdNewDraft) {
          return {
            rows: [
              {
                id: version2Id,
                agent_id: agentAId,
                version_number: 2,
                status: 'DRAFT',
                role: 'New Forked Draft Role',
              },
            ],
          };
        }
        return { rows: [] };
      }
      // Max version lookup
      if (q.includes('MAX(version_number)')) {
        return { rows: [{ max_ver: 1 }] };
      }
      // Existing published version lookup for baseline
      if (q.includes('FROM ai_agent_versions') && q.includes('WHERE id =')) {
        return {
          rows: [
            {
              id: version1Id,
              role: 'Old Published Role',
              system_instructions: 'Old Published Instructions',
              tone: 'Professional',
              language: 'English',
              model: 'gpt-4o-mini',
              provider: 'openai',
            },
          ],
        };
      }
      // Insert new draft version (fork)
      if (q.includes('INSERT INTO ai_agent_versions')) {
        createdNewDraft = true;
        newDraftVersionNumber = values[3];
        return {
          rows: [
            {
              id: version2Id,
              agent_id: agentAId,
              version_number: newDraftVersionNumber,
              status: 'DRAFT',
              role: values[5],
              system_instructions: values[6],
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await agentService.updateDraft({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      role: 'New Forked Draft Role',
      userId: userAId,
    });

    expect(createdNewDraft).toBe(true);
    expect(newDraftVersionNumber).toBe(2);
    expect(result.draftVersion.role).toBe('New Forked Draft Role');
  });

  it('13. Rollback creates a new version from target historical version without mutating history', async () => {
    let rolledBackVersionNumber = 0;
    let rolledBackFromRole = '';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              status: 'ACTIVE',
              current_version_id: version2Id,
            },
          ],
        };
      }
      // Target version 1 lookup
      if (q.includes('FROM ai_agent_versions') && q.includes('WHERE agent_id =') && q.includes('version_number =')) {
        return {
          rows: [
            {
              id: version1Id,
              agent_id: agentAId,
              version_number: 1,
              status: 'ARCHIVED',
              role: 'Historical V1 Role',
              system_instructions: 'Historical V1 Instructions',
              tone: 'Concise',
              language: 'English',
              model: 'gpt-4o-mini',
              provider: 'openai',
            },
          ],
        };
      }
      // Max version lookup
      if (q.includes('MAX(version_number)')) {
        return { rows: [{ max_ver: 2 }] };
      }
      // Archive currently published version
      if (q.includes("SET status = 'ARCHIVED'")) {
        return { rows: [] };
      }
      // Insert new version 3 as PUBLISHED
      if (q.includes('INSERT INTO ai_agent_versions')) {
        rolledBackVersionNumber = values[3];
        rolledBackFromRole = values[4];
        return {
          rows: [
            {
              id: 'version-3333-3333-3333-333333333333',
              agent_id: agentAId,
              version_number: rolledBackVersionNumber,
              status: 'PUBLISHED',
              role: rolledBackFromRole,
            },
          ],
        };
      }
      if (q.includes('UPDATE ai_agents')) {
        return { rows: [{ id: agentAId, status: 'ACTIVE' }] };
      }
      return { rows: [] };
    });

    await agentService.rollbackVersion({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      targetVersionNumber: 1,
      userId: userAId,
    });

    expect(rolledBackVersionNumber).toBe(3);
    expect(rolledBackFromRole).toBe('Historical V1 Role');
    expect(testAiRealtimeEvents.some((e) => e.event === 'agent.rollback')).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Lifecycle Controls (Pause & Activate)
  // ══════════════════════════════════════════════════════════════════════════

  it('14. Pause and activate update agent status and emit realtime events', async () => {
    let currentStatus = 'ACTIVE';

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              status: currentStatus,
              current_version_id: version1Id,
            },
          ],
        };
      }
      if (q.includes("status = 'PAUSED'")) {
        currentStatus = 'PAUSED';
        return { rows: [{ id: agentAId, status: 'PAUSED' }] };
      }
      if (q.includes("status = 'ACTIVE'")) {
        currentStatus = 'ACTIVE';
        return { rows: [{ id: agentAId, status: 'ACTIVE' }] };
      }
      return { rows: [] };
    });

    await agentService.pauseAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      userId: userAId,
    });
    expect(currentStatus).toBe('PAUSED');
    expect(testAiRealtimeEvents.some((e) => e.event === 'agent.paused')).toBe(true);

    await agentService.activateAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      userId: userAId,
    });
    expect(currentStatus).toBe('ACTIVE');
    expect(testAiRealtimeEvents.some((e) => e.event === 'agent.updated')).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: AI Provider Abstraction & OpenAI Provider
  // ══════════════════════════════════════════════════════════════════════════

  it('15. AIProviderFactory returns OpenAIProvider for openai', () => {
    const provider = AIProviderFactory.getProvider('openai');
    expect(provider.name).toBe('openai');
  });

  it('16. AIProviderFactory throws error for unsupported providers', () => {
    expect(() => AIProviderFactory.getProvider('gemini')).toThrow(/future update/i);
    expect(() => AIProviderFactory.getProvider('unknown_provider')).toThrow(/unsupported ai provider/i);
  });

  it('17. OpenAIProvider returns graceful failure if OPENAI_API_KEY is missing', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const provider = new OpenAIProvider();
    await expect(
      provider.generateResponse({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o-mini',
      }),
    ).rejects.toThrow(/AI provider is not configured/i);

    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
  });

  it('18. OpenAIProvider returns content, latency, and tokens when mock handler is active', async () => {
    OpenAIProvider.setTestMockHandler(async () => ({
      content: 'Hello! I am your AI assistant. How may I assist you?',
      usage: {
        promptTokens: 15,
        completionTokens: 12,
        totalTokens: 27,
      },
    }));

    const provider = new OpenAIProvider();
    const result = await provider.generateResponse({
      messages: [{ role: 'user', content: 'Hi there' }],
      model: 'gpt-4o-mini',
    });

    expect(result.content).toContain('Hello! I am your AI assistant');
    expect(result.usage.totalTokens).toBe(27);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect((result as any).error).toBeUndefined();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6: AI Orchestrator & Safety Guardrails
  // ══════════════════════════════════════════════════════════════════════════

  it('19. AIOrchestrator generates response with instructions and records usage', async () => {
    OpenAIProvider.setTestMockHandler(async () => ({
      content: 'Our return policy allows returns within 30 days of delivery.',
      usage: { promptTokens: 30, completionTokens: 14, totalTokens: 44 },
    }));

    let recordedUsage: any = null;
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents')) {
        return {
          rows: [
            {
              id: agentAId,
              name: 'Support Bot',
              status: 'ACTIVE',
              current_version_id: version1Id,
              role: 'Customer Support',
              system_instructions: 'Help customers with policies',
              tone: 'Professional',
              language: 'English',
              model: 'gpt-4o-mini',
              provider: 'openai',
              max_response_length: 200,
              escalation_enabled: true,
              escalation_conditions: ['speak to human', 'refund'],
            },
          ],
        };
      }
      if (q.includes('INSERT INTO ai_usage')) {
        recordedUsage = {
          agentId: values[2],
          provider: values[4],
          model: values[5],
          totalTokens: values[8],
          status: values[10],
        };
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await AIOrchestrator.testAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      message: 'What is your return policy?',
    });

    expect(result.response).toContain('return policy');
    expect(result.shouldEscalate).toBe(false);
    expect(recordedUsage).not.toBeNull();
    expect(recordedUsage.status).toBe('SUCCESS');
    expect(recordedUsage.totalTokens).toBe(44);
  });

  it('20. AIOrchestrator detects explicit human escalation requests', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents')) {
        return {
          rows: [
            {
              id: agentAId,
              role: 'Support',
              system_instructions: 'Help customers',
              escalation_enabled: true,
              escalation_message: 'Transferring you to a human agent.',
              escalation_conditions: ['human', 'agent'],
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await AIOrchestrator.testAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      message: 'Please connect me to a human representative right now.',
    });

    expect(result.shouldEscalate).toBe(true);
    expect(result.response).toBe('Transferring you to a human agent.');
    expect(result.escalationReason).toContain('human');
  });

  it('21. AIOrchestrator applies fallback guardrail when provider fails', async () => {
    OpenAIProvider.setTestMockHandler(async () => {
      throw new Error('AI Provider Service Unavailable');
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents')) {
        return {
          rows: [
            {
              id: agentAId,
              role: 'Support',
              fallback_message: 'Our AI is temporarily resting. Please try again soon.',
              model: 'gpt-4o-mini',
              provider: 'openai',
              escalation_enabled: false,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await AIOrchestrator.testAgent({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
      message: 'What are your hours?',
    });

    expect(result.response).toBe('Our AI is temporarily resting. Please try again soon.');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7: Inbox Handling & Queue Integration
  // ══════════════════════════════════════════════════════════════════════════

  it('22. Enqueueing AI message creates job with idempotency key', async () => {
    const jobId = await enqueueAiMessage({
      workspaceId: workspaceAId,
      projectId: projectAId,
      conversationId: 'conv-123',
      messageId: 'msg-abc-123',
      messageBody: 'Hello from WhatsApp',
    });

    expect(jobId).toBe('ai-msg-abc-123');
    expect(testEnqueuedAiJobs.length).toBe(1);
    expect(testEnqueuedAiJobs[0].name).toBe('process-ai-message');
    expect(testEnqueuedAiJobs[0].opts?.jobId).toBe('ai-msg-abc-123');
  });

  it('23. Human takeover skips AI response (handling_mode === HUMAN_HANDLING)', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM conversations')) {
        return {
          rows: [
            {
              id: 'conv-123',
              workspace_id: workspaceAId,
              handling_mode: 'HUMAN_HANDLING', // Human takeover active!
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await processAiJob({
      workspaceId: workspaceAId,
      projectId: projectAId,
      conversationId: 'conv-123',
      messageId: 'msg-456',
      messageBody: 'Hello',
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('HUMAN_HANDLING');
  });

  it('24. AIWorker processes message for AI_HANDLING conversation and triggers response', async () => {
    OpenAIProvider.setTestMockHandler(async () => ({
      content: 'We are open from 9am to 6pm Monday to Friday.',
      usage: { promptTokens: 20, completionTokens: 12, totalTokens: 32 },
    }));

    let outboundSent = false;
    let contactActivityLogged = false;

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM conversations')) {
        return {
          rows: [
            {
              id: 'conv-123',
              workspace_id: workspaceAId,
              project_id: projectAId,
              contact_id: 'contact-1',
              whatsapp_phone_number_id: 'phone-1',
              handling_mode: 'AI_HANDLING',
              window_expires_at: new Date(Date.now() + 86400000).toISOString(),
              phone_number: '+1234567890',
              wa_id: '1234567890',
            },
          ],
        };
      }
      if (q.includes('FROM ai_agents')) {
        return {
          rows: [
            {
              id: agentAId,
              agent_id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              status: 'ACTIVE',
              handling_mode: 'AI_HANDLING',
              current_version_id: version1Id,
              version_id: version1Id,
              version_number: 1,
              role: 'Support Bot',
              system_instructions: 'Answer hours of operation',
              tone: 'Professional',
              language: 'English',
              model: 'gpt-4o-mini',
              provider: 'openai',
              escalation_enabled: false,
            },
          ],
        };
      }
      if (q.includes('SELECT') && q.includes('idempotency_key')) {
        return { rows: [] };
      }
      if (q.includes('FROM messages')) {
        return {
          rows: [
            {
              id: 'msg-1',
              direction: 'inbound',
              sender_type: 'customer',
              body: 'What are your hours?',
              created_at: new Date(),
            },
          ],
        };
      }
      if (q.includes('INSERT INTO messages')) {
        outboundSent = true;
        return {
          rows: [
            {
              id: 'outbound-msg-1',
              direction: 'outbound',
              sender_type: 'ai_agent',
              body: 'We are open from 9am to 6pm Monday to Friday.',
            },
          ],
        };
      }
      if (q.includes('INSERT INTO contact_activities')) {
        contactActivityLogged = true;
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await processAiJob({
      workspaceId: workspaceAId,
      projectId: projectAId,
      conversationId: 'conv-123',
      messageId: 'msg-1',
      messageBody: 'What are your hours?',
    });

    expect(result.success).toBe(true);
    expect(result.response).toContain('9am to 6pm');
    expect(outboundSent).toBe(true);
    expect(contactActivityLogged).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8: Security & Zero Fake Data
  // ══════════════════════════════════════════════════════════════════════════

  it('25. API responses never leak provider API keys or raw internal secrets', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('FROM ai_agents') && q.includes('id =')) {
        return {
          rows: [
            {
              id: agentAId,
              workspace_id: workspaceAId,
              project_id: projectAId,
              name: 'Secure Agent',
              current_version_id: version1Id,
            },
          ],
        };
      }
      if (q.includes('FROM ai_agent_versions')) {
        return {
          rows: [
            {
              id: version1Id,
              provider: 'openai',
              model: 'gpt-4o-mini',
              configuration: { apiKey: 'sk-secret-do-not-leak' }, // Legacy/bad field
            },
          ],
        };
      }
      return { rows: [] };
    });

    const agentData = await agentService.getAgentById({
      workspaceId: workspaceAId,
      projectId: projectAId,
      agentId: agentAId,
    });

    const serialized = JSON.stringify(agentData);
    expect(serialized).not.toContain('sk-secret-do-not-leak');
  });

  it('26. Empty state is returned when database has no agents (zero fake mock data)', async () => {
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      if (q.includes('COUNT(*)')) {
        return { rows: [{ count: '0' }] };
      }
      if (q.includes('FROM ai_agents')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await agentService.getAgents({
      workspaceId: workspaceAId,
      projectId: projectAId,
    });

    expect(result.agents).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('27. Preview test route executes against provider using draftOverride without creating agent record in DB', async () => {
    OpenAIProvider.setTestMockHandler(async () => ({
      content: 'Hello! I am your preview assistant.',
      usage: { promptTokens: 15, completionTokens: 8, totalTokens: 23 },
    }));

    const authHandler = setupProjectAuth({
      authorized: true,
      projectId: projectAId,
    });

    let dbAgentInserted = false;
    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      const auth = authHandler(q, values);
      if (auth) return auth;
      if (q.includes('INSERT INTO ai_agents')) {
        dbAgentInserted = true;
      }
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents/preview-test`, {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi there' }],
        draftOverride: {
          role: 'Virtual Concierge',
          systemInstructions: 'Be welcoming and brief.',
          tone: 'Friendly',
        },
      }),
    });

    const res = await previewTestRoute(req, { params: Promise.resolve({ id: projectAId }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data.response).toBe('Hello! I am your preview assistant.');
    expect(dbAgentInserted).toBe(false);
  });

  it('28. Agent playground test route accepts flexible payloads (conversationHistory & message)', async () => {
    OpenAIProvider.setTestMockHandler(async () => ({
      content: 'I can assist you with your booking.',
      usage: { promptTokens: 18, completionTokens: 10, totalTokens: 28 },
    }));

    const authHandler = setupProjectAuth({
      authorized: true,
      projectId: projectAId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      const auth = authHandler(q, values);
      if (auth) return auth;
      if (q.includes('FROM ai_agents')) {
        return {
          rows: [
            {
              id: agentAId,
              role: 'Booking Agent',
              system_instructions: 'Assist with reservations',
              current_version_id: version1Id,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const req = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents/${agentAId}/test`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Can I book a slot?',
        conversationHistory: [
          { role: 'user', content: 'Can I book a slot?' },
        ],
      }),
    });

    const res = await testAgentRoute(req, {
      params: Promise.resolve({ id: projectAId, agentId: agentAId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.data.response).toContain('booking');
    expect(json.data.usage.totalTokens).toBe(28);
  });

  it('29. Unconfigured AI provider returns explicit error message rather than fake mock responses', async () => {
    OpenAIProvider.setTestMockHandler(null);
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const authHandler = setupProjectAuth({
      authorized: true,
      projectId: projectAId,
    });

    mockSql.mockImplementation(async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');
      const auth = authHandler(q, values);
      if (auth) return auth;
      return { rows: [] };
    });

    try {
      const req = new NextRequest(`http://localhost/api/projects/${projectAId}/ai/agents/preview-test`, {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          draftOverride: {
            role: 'Support Bot',
            systemInstructions: 'Help politely',
          },
        }),
      });

      const res = await previewTestRoute(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('AI provider is not configured.');
    } finally {
      if (originalApiKey) {
        process.env.OPENAI_API_KEY = originalApiKey;
      }
    }
  });
});

