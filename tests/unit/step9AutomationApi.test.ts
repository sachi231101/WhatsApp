import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── In-Memory Store for SQL Simulation ────────────────────────────────────
interface InMemAutomation {
  id: string;
  workspace_id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  current_version_id: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

interface InMemVersion {
  id: string;
  automation_id: string;
  version_number: number;
  status: string;
  created_by: string | null;
  created_at: Date;
  published_at: Date | null;
}

interface InMemNode {
  id: string;
  automation_version_id: string;
  node_key: string;
  type: string;
  label: string;
  position_x: number;
  position_y: number;
  configuration: any;
  created_at: Date;
  updated_at: Date;
}

interface InMemEdge {
  id: string;
  automation_version_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  condition_key: string | null;
  created_at: Date;
}

let store: {
  automations: InMemAutomation[];
  versions: InMemVersion[];
  nodes: InMemNode[];
  edges: InMemEdge[];
};

let autoIdCounter = 1;

// ── Hoisted SQL & Mocks ───────────────────────────────────────────────────
const { mockSql, sqlMockObj } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn();
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
  db: {},
}));

vi.mock('@/lib/auth/context', () => ({
  ensureCoreTables: vi.fn().mockResolvedValue(undefined),
}));

// Mock Audit Logger
const mockAuditLogger = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/services/audit/auditLogger', () => ({
  recordAuditLog: (...args: any[]) => mockAuditLogger(...args),
}));

// Mock Auth & Project Access
let currentUser = { id: 'user-123', email: 'user@example.com' };
let currentRole = 'owner';

vi.mock('@/lib/auth/user', () => ({
  requireAuthenticatedUser: vi.fn(async () => currentUser),
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    statusCode = 401;
  },
}));

vi.mock('@/lib/projects/project-access', () => {
  class ProjectNotFoundError extends Error {
    statusCode = 404;
    constructor(msg = 'Project not found.') {
      super(msg);
      this.name = 'ProjectNotFoundError';
    }
  }

  const requireProjectAccess = vi.fn(async (projectId: string, minRole?: string) => {
    if (projectId === 'non-existent-proj') {
      throw new ProjectNotFoundError();
    }
    const { hasRoleAtLeast } = await import('@/lib/auth/roles');
    if (minRole && !hasRoleAtLeast(currentRole, minRole)) {
      const { RoleAuthorizationError } = await import('@/lib/workspace/workspace-access');
      throw new RoleAuthorizationError(minRole as any);
    }
    return {
      project: { id: projectId, workspace_id: 'ws-123', name: 'Test Project' },
      workspace: { id: 'ws-123', name: 'Test Workspace' },
      membership: { id: 'mem-1', role: currentRole, status: 'active' },
    };
  });

  return {
    requireProjectAccess,
    ProjectNotFoundError,
  };
});

// Import API Route Handlers
import {
  GET as listAutomationsRoute,
  POST as createAutomationRoute,
} from '@/app/api/projects/[id]/automations/route';
import {
  GET as getAutomationRoute,
  PATCH as updateAutomationRoute,
  DELETE as archiveAutomationRoute,
} from '@/app/api/projects/[id]/automations/[automationId]/route';
import { POST as activateAutomationRoute } from '@/app/api/projects/[id]/automations/[automationId]/activate/route';
import { POST as pauseAutomationRoute } from '@/app/api/projects/[id]/automations/[automationId]/pause/route';
import { POST as duplicateAutomationRoute } from '@/app/api/projects/[id]/automations/[automationId]/duplicate/route';
import {
  GET as getVersionsRoute,
  POST as createVersionRoute,
} from '@/app/api/projects/[id]/automations/[automationId]/versions/route';
import {
  GET as getVersionGraphRoute,
  PATCH as updateVersionGraphRoute,
} from '@/app/api/projects/[id]/automations/[automationId]/versions/[versionId]/route';

// Top-Level Routes
import {
  GET as topLevelListRoute,
  POST as topLevelCreateRoute,
} from '@/app/api/automations/route';
import {
  GET as topLevelGetRoute,
  PATCH as topLevelPatchRoute,
  DELETE as topLevelDeleteRoute,
} from '@/app/api/automations/[automationId]/route';

describe('Step 9: Automation Module Phase 2 — API & Authorization', () => {
  const PROJECT_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_PROJECT_ID = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'user-123', email: 'user@example.com' };
    currentRole = 'owner';
    autoIdCounter = 1;

    store = {
      automations: [],
      versions: [],
      nodes: [],
      edges: [],
    };

    const makeUuid = (prefix: string) => `${prefix}${String(autoIdCounter++).padStart(12, '0')}`;

    // Smart SQL Mock Implementation
    const handleSql = async (strings: any, ...values: any[]) => {
      const q = typeof strings === 'string' ? strings : strings.join('?');

      // Transactions
      if (q.includes('BEGIN') || q.includes('COMMIT') || q.includes('ROLLBACK')) {
        return { rows: [] };
      }

      // COUNT automations
      if (q.includes('COUNT(*)::int as total') && q.includes('FROM automations')) {
        const matching = store.automations.filter((a) => a.status !== 'ARCHIVED');
        return { rows: [{ total: matching.length }] };
      }

      // SELECT automations list
      if (q.includes('SELECT') && q.includes('FROM automations a') && q.includes('LEFT JOIN automation_versions cv')) {
        const rows = store.automations
          .filter((a) => a.status !== 'ARCHIVED')
          .map((a) => {
            const cv = store.versions.find((v) => v.id === a.current_version_id);
            const nCnt = store.nodes.filter((n) => n.automation_version_id === a.current_version_id).length;
            return {
              ...a,
              current_version_number: cv?.version_number || 1,
              current_version_status: cv?.status || 'DRAFT',
              current_version_published_at: cv?.published_at || null,
              node_count: nCnt,
            };
          });
        return { rows };
      }

      // SELECT single automation with tenant check (supports both automationDomainService and automationService)
      if (q.includes('FROM automations') && (q.includes('workspace_id =') || q.includes('a.workspace_id =')) && (q.includes('project_id =') || q.includes('a.project_id ='))) {
        const autoId = values.find((v) => typeof v === 'string' && store.automations.some((a) => a.id === v));
        const item = store.automations.find((a) => a.id === autoId && a.workspace_id === 'ws-123' && a.project_id === PROJECT_ID);
        return { rows: item ? [item] : [] };
      }

      // SELECT single automation by id (cross check)
      if (q.includes('SELECT id FROM automations WHERE id =') || q.includes('SELECT project_id FROM automations WHERE id =')) {
        const autoId = values.find((v) => typeof v === 'string' && store.automations.some((a) => a.id === v));
        const item = store.automations.find((a) => a.id === autoId);
        return { rows: item ? [item] : [] };
      }

      // SELECT single automation_version by id
      if (q.includes('FROM automation_versions') && q.includes('WHERE id =')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        const item = store.versions.find((v) => v.id === verId);
        return { rows: item ? [item] : [] };
      }

      // SELECT latest draft version for automation
      if (q.includes('FROM automation_versions') && q.includes("status = 'DRAFT'")) {
        const autoId = values.find((v) => typeof v === 'string' && store.automations.some((a) => a.id === v));
        const drafts = store.versions
          .filter((v) => v.automation_id === autoId && v.status === 'DRAFT')
          .sort((a, b) => b.version_number - a.version_number);
        return { rows: drafts.length > 0 ? [drafts[0]] : [] };
      }

      // SELECT automation_versions by automation_id ORDER BY version_number DESC
      if (q.includes('FROM automation_versions') && q.includes('ORDER BY version_number DESC')) {
        const autoId = values.find((v) => typeof v === 'string' && store.automations.some((a) => a.id === v));
        const matching = store.versions
          .filter((v) => v.automation_id === autoId)
          .sort((a, b) => b.version_number - a.version_number);
        return { rows: matching };
      }

      // COUNT nodes for version
      if (q.includes('COUNT(*)::int') && q.includes('FROM automation_nodes')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        const cnt = store.nodes.filter((n) => n.automation_version_id === verId).length;
        return { rows: [{ count: cnt }] };
      }

      // MAX version_number
      if (q.includes('MAX(version_number)')) {
        const autoId = values.find((v) => typeof v === 'string' && store.automations.some((a) => a.id === v));
        const maxV = store.versions
          .filter((v) => v.automation_id === autoId)
          .reduce((max, cur) => Math.max(max, Number(cur.version_number) || 0), 0);
        return { rows: [{ max_version: maxV }] };
      }

      // INSERT INTO automations
      if (q.includes('INSERT INTO automations')) {
        const id = makeUuid('00000000-0000-0000-0001-');
        const auto: InMemAutomation = {
          id,
          workspace_id: values[0] || 'ws-123',
          project_id: values[1] || PROJECT_ID,
          name: values[2],
          description: values[3] || null,
          status: values[4] || 'DRAFT',
          current_version_id: null,
          created_by: values[5] || null,
          created_at: new Date(),
          updated_at: new Date(),
          archived_at: null,
        };
        store.automations.push(auto);
        return { rows: [auto] };
      }

      // INSERT INTO automation_versions
      if (q.includes('INSERT INTO automation_versions')) {
        const id = makeUuid('00000000-0000-0000-0002-');
        const versionNumber = typeof values[1] === 'number' ? values[1] : 1;
        const createdBy = typeof values[1] === 'string' ? values[1] : (values[2] || null);
        const ver: InMemVersion = {
          id,
          automation_id: values[0],
          version_number: versionNumber,
          status: 'DRAFT',
          created_by: createdBy,
          created_at: new Date(),
          published_at: null,
        };
        store.versions.push(ver);
        return { rows: [ver] };
      }

      // UPDATE automations
      if (q.includes('UPDATE automations')) {
        const autoId = values.find((v) => typeof v === 'string' && store.automations.some((a) => a.id === v));
        const auto = store.automations.find((a) => a.id === autoId);
        if (auto) {
          if (q.includes('current_version_id =')) {
            const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
            if (verId) auto.current_version_id = verId;
          }
          if (q.includes('status = \'ARCHIVED\'')) {
            auto.status = 'ARCHIVED';
            auto.archived_at = new Date();
          } else if (q.includes('status = \'ACTIVE\'')) {
            auto.status = 'ACTIVE';
          } else if (q.includes('status = \'PAUSED\'')) {
            auto.status = 'PAUSED';
          }
          if (q.includes('name =')) {
            const newName = values.find((v) => typeof v === 'string' && v !== autoId && v !== 'ws-123' && v !== PROJECT_ID);
            if (newName) auto.name = newName;
          }
          auto.updated_at = new Date();
          return { rows: [auto] };
        }
        return { rows: [] };
      }

      // UPDATE automation_versions
      if (q.includes('UPDATE automation_versions')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        const ver = store.versions.find((v) => v.id === verId);
        if (ver) {
          if (q.includes('status = \'PUBLISHED\'')) {
            ver.status = 'PUBLISHED';
            ver.published_at = new Date();
          }
          return { rows: [ver] };
        }
        return { rows: [] };
      }

      // DELETE FROM automation_edges
      if (q.includes('DELETE FROM automation_edges')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        store.edges = store.edges.filter((e) => e.automation_version_id !== verId);
        return { rows: [] };
      }

      // DELETE FROM automation_nodes
      if (q.includes('DELETE FROM automation_nodes')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        store.nodes = store.nodes.filter((n) => n.automation_version_id !== verId);
        return { rows: [] };
      }

      // INSERT INTO automation_nodes
      if (q.includes('INSERT INTO automation_nodes')) {
        const id = makeUuid('00000000-0000-0000-0003-');
        const node: InMemNode = {
          id,
          automation_version_id: values[0],
          node_key: values[1],
          type: values[2],
          label: values[3],
          position_x: values[4] || 0,
          position_y: values[5] || 0,
          configuration: values[6] ? JSON.parse(values[6]) : {},
          created_at: new Date(),
          updated_at: new Date(),
        };
        store.nodes.push(node);
        return { rows: [node] };
      }

      // SELECT FROM automation_nodes
      if (q.includes('FROM automation_nodes')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        const matching = store.nodes.filter((n) => n.automation_version_id === verId);
        return { rows: matching };
      }

      // INSERT INTO automation_edges
      if (q.includes('INSERT INTO automation_edges')) {
        const id = makeUuid('00000000-0000-0000-0004-');
        const edge: InMemEdge = {
          id,
          automation_version_id: values[0],
          source_node_id: values[1],
          target_node_id: values[2],
          source_handle: values[3] || null,
          target_handle: values[4] || null,
          condition_key: values[5] || null,
          created_at: new Date(),
        };
        store.edges.push(edge);
        return { rows: [edge] };
      }

      // SELECT FROM automation_edges
      if (q.includes('FROM automation_edges')) {
        const verId = values.find((v) => typeof v === 'string' && store.versions.some((ver) => ver.id === v));
        const matching = store.edges.filter((e) => e.automation_version_id === verId);
        return { rows: matching };
      }

      return { rows: [] };
    };

    mockSql.mockImplementation(handleSql);
    mockSql.query.mockImplementation(handleSql);
  });

  // ==========================================================================
  // 1. CREATE AUTOMATION
  // ==========================================================================
  describe('Create Automation', () => {
    it('should create an automation with initial draft version and record audit log', async () => {
      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Welcome Series',
          description: 'Onboarding messages',
        }),
      });

      const res = await createAutomationRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.status).toBe('ok');
      expect(json.data.automation.name).toBe('Welcome Series');
      expect(json.data.draftVersion.versionNumber).toBe(1);
      expect(json.data.draftVersion.status).toBe('DRAFT');

      // Verify audit log recorded
      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.created',
          entityType: 'automation',
        })
      );
    });

    it('should reject creation if name is missing or empty (400)', async () => {
      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '   ',
        }),
      });

      const res = await createAutomationRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.status).toBe('error');
      expect(json.error).toContain('Automation name is required');
    });

    it('should reject creation if name exceeds 255 characters (400)', async () => {
      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A'.repeat(256),
        }),
      });

      const res = await createAutomationRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('cannot exceed 255 characters');
    });
  });

  // ==========================================================================
  // 2. GET & UPDATE AUTOMATION
  // ==========================================================================
  describe('Get & Update Automation', () => {
    it('should retrieve a created automation by ID', async () => {
      // First create one
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Lead Qualifier' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const getReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}`);
      const getRes = await getAutomationRoute(getReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const getJson = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getJson.data.name).toBe('Lead Qualifier');
    });

    it('should update name and description and record audit log', async () => {
      // Create first
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Old Name', description: 'Old Desc' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const patchReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Name',
          description: 'New Desc',
        }),
      });

      const patchRes = await updateAutomationRoute(patchReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const patchJson = await patchRes.json();

      expect(patchRes.status).toBe(200);
      expect(patchJson.status).toBe('ok');
      expect(patchJson.data.name).toBe('New Name');

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.updated',
          entityType: 'automation',
          entityId: data.automation.id,
        })
      );
    });

    it('should reject client attempts to directly modify protected fields like workspace_id or current_version_id (400)', async () => {
      const patchReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/00000000-0000-0000-0000-000000000001`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: 'malicious-workspace',
          name: 'Valid Name',
        }),
      });

      const patchRes = await updateAutomationRoute(patchReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: '00000000-0000-0000-0000-000000000001' }),
      });
      const json = await patchRes.json();

      expect(patchRes.status).toBe(400);
      expect(json.status).toBe('error');
      expect(json.error).toContain("cannot be modified directly");
    });
  });

  // ==========================================================================
  // 3. DUPLICATE AUTOMATION
  // ==========================================================================
  describe('Duplicate Automation', () => {
    it('should duplicate an automation with (Copy) suffix and clone its graph', async () => {
      // Create original
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Payment Reminder' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const dupReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}/duplicate`, {
        method: 'POST',
      });

      const dupRes = await duplicateAutomationRoute(dupReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const dupJson = await dupRes.json();

      expect(dupRes.status).toBe(201);
      expect(dupJson.status).toBe('ok');
      expect(dupJson.data.automation.name).toBe('Payment Reminder (Copy)');
      expect(dupJson.data.draftVersion.versionNumber).toBe(1);

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.created',
          entityType: 'automation',
        })
      );
    });
  });

  // ==========================================================================
  // 4. ARCHIVE, ACTIVATE & PAUSE
  // ==========================================================================
  describe('Status Transitions: Archive, Activate, Pause', () => {
    it('should archive an automation and record audit log', async () => {
      // Create first
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Temporary Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const delReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}`, {
        method: 'DELETE',
      });

      const delRes = await archiveAutomationRoute(delReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const delJson = await delRes.json();

      expect(delRes.status).toBe(200);
      expect(delJson.status).toBe('ok');
      expect(delJson.data.status).toBe('ARCHIVED');

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.archived',
          entityType: 'automation',
          entityId: data.automation.id,
        })
      );
    });

    it('should activate an automation', async () => {
      // Create first
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Active Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const actReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}/activate`, {
        method: 'POST',
      });

      const actRes = await activateAutomationRoute(actReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const actJson = await actRes.json();

      expect(actRes.status).toBe(200);
      expect(actJson.data.status).toBe('ACTIVE');
    });

    it('should pause an automation', async () => {
      // Create first
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Paused Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const pauseReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}/pause`, {
        method: 'POST',
      });

      const pauseRes = await pauseAutomationRoute(pauseReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const pauseJson = await pauseRes.json();

      expect(pauseRes.status).toBe(200);
      expect(pauseJson.data.status).toBe('PAUSED');
    });
  });

  // ==========================================================================
  // 5. LIST, SEARCH & PAGINATION
  // ==========================================================================
  describe('List, Search & Pagination', () => {
    it('should list automations with status, search, and pagination parameters', async () => {
      // Create two automations
      await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'VIP Customer Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Standard Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/automations?status=ALL&limit=10&offset=0`
      );

      const res = await listAutomationsRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe('ok');
      expect(json.totalCount).toBe(2);
      expect(json.data.length).toBe(2);
    });

    it('should reject invalid status filter parameter (400)', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/automations?status=INVALID_STATUS`
      );

      const res = await listAutomationsRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.status).toBe('error');
      expect(json.error).toContain('Invalid status filter');
    });
  });

  // ==========================================================================
  // 6. VERSION OPERATIONS & DRAFT MODIFICATION
  // ==========================================================================
  describe('Version Operations & Draft Modification', () => {
    it('should create a new draft version and record audit log', async () => {
      // Create automation first
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Versioned Workflow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();

      const verReq = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}/versions`, {
        method: 'POST',
      });

      const verRes = await createVersionRoute(verReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id }),
      });
      const verJson = await verRes.json();

      expect(verRes.status).toBe(201);
      expect(verJson.status).toBe('ok');
      expect(verJson.data.versionNumber).toBe(2);
      expect(verJson.data.status).toBe('DRAFT');

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.version.created',
          entityType: 'automation_version',
        })
      );
    });

    it('should update draft version nodes and edges', async () => {
      // Create automation first
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Graph Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();
      const versionId = data.draftVersion.id;

      const patchReq = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}/versions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: [
              { nodeKey: 'node_trigger', type: 'TRIGGER', label: 'When message arrives', positionX: 10, positionY: 20 },
              { nodeKey: 'node_reply', type: 'ACTION', label: 'Send WhatsApp reply', positionX: 200, positionY: 20 },
            ],
            edges: [
              { sourceNodeId: 'node_trigger', targetNodeId: 'node_reply', conditionKey: 'YES' },
            ],
          }),
        }
      );

      const patchRes = await updateVersionGraphRoute(patchReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id, versionId }),
      });
      const patchJson = await patchRes.json();

      expect(patchRes.status).toBe(200);
      expect(patchJson.status).toBe('ok');
      expect(patchJson.data.nodes.length).toBe(2);
      expect(patchJson.data.edges.length).toBe(1);

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'automation.updated',
          entityType: 'automation_version',
        })
      );
    });

    it('should REJECT modification of a PUBLISHED version (400 Bad Request)', async () => {
      // Create automation
      const autoRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Published Flow' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await autoRes.json();
      const versionId = data.draftVersion.id;

      // Mark version as published in store
      const verInStore = store.versions.find((v) => v.id === versionId);
      if (verInStore) {
        verInStore.status = 'PUBLISHED';
        verInStore.published_at = new Date();
      }

      const patchReq = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/automations/${data.automation.id}/versions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: [{ nodeKey: 'node_1', type: 'TRIGGER', label: 'Trigger' }],
          }),
        }
      );

      const patchRes = await updateVersionGraphRoute(patchReq, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: data.automation.id, versionId }),
      });
      const patchJson = await patchRes.json();

      expect(patchRes.status).toBe(400);
      expect(patchJson.status).toBe('error');
      expect(patchJson.error).toContain('cannot be edited directly');
    });
  });

  // ==========================================================================
  // 7. AUTHORIZATION & ROLE PERMISSIONS
  // ==========================================================================
  describe('Authorization & Role Permissions', () => {
    it('should allow VIEWER role to read (GET)', async () => {
      currentRole = 'viewer';

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`);
      const res = await listAutomationsRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(200);
    });

    it('should allow AGENT role to read (GET)', async () => {
      currentRole = 'agent';

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`);
      const res = await listAutomationsRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(200);
    });

    it('should FORBID VIEWER role from creating automations (403)', async () => {
      currentRole = 'viewer';

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauthorized Flow' }),
      });

      const res = await createAutomationRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.status).toBe('error');
      expect(json.error).toContain('Forbidden');
    });

    it('should FORBID AGENT role from archiving automations (403)', async () => {
      currentRole = 'agent';

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations/00000000-0000-0000-0000-000000000001`, {
        method: 'DELETE',
      });

      const res = await archiveAutomationRoute(req, {
        params: Promise.resolve({ id: PROJECT_ID, automationId: '00000000-0000-0000-0000-000000000001' }),
      });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.status).toBe('error');
      expect(json.error).toContain('Forbidden');
    });

    it('should allow MANAGER role to create automations', async () => {
      currentRole = 'manager';

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Manager Flow' }),
      });

      const res = await createAutomationRoute(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(201);
    });

    it('should return 404 for non-existent project', async () => {
      const req = new NextRequest(`http://localhost/api/projects/non-existent-proj/automations`);
      const res = await listAutomationsRoute(req, { params: Promise.resolve({ id: 'non-existent-proj' }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Project not found');
    });
  });

  // ==========================================================================
  // 8. TOP-LEVEL ROUTE ALIASES
  // ==========================================================================
  describe('Top-Level Route Aliases (/api/automations/...) ', () => {
    it('should list automations via top-level route with ?projectId query param', async () => {
      // Create one automation first
      await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Top Level Test' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );

      const req = new NextRequest(`http://localhost/api/automations?projectId=${PROJECT_ID}`);
      const res = await topLevelListRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe('ok');
      expect(json.totalCount).toBe(1);
      expect(json.data[0].name).toBe('Top Level Test');
    });

    it('should create automation via top-level route with projectId in body', async () => {
      const req = new NextRequest(`http://localhost/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          name: 'Top Level Created',
        }),
      });

      const res = await topLevelCreateRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.status).toBe('ok');
      expect(json.data.automation.name).toBe('Top Level Created');
    });

    it('should get automation via top-level route by ID', async () => {
      const createRes = await createAutomationRoute(
        new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/automations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Direct Lookup' }),
        }),
        { params: Promise.resolve({ id: PROJECT_ID }) }
      );
      const { data } = await createRes.json();

      const req = new NextRequest(`http://localhost/api/automations/${data.automation.id}`);
      const res = await topLevelGetRoute(req, { params: Promise.resolve({ automationId: data.automation.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.name).toBe('Direct Lookup');
    });
  });
});
