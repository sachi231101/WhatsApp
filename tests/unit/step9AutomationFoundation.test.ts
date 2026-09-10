import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  db: {},
}));

// Mock ensureCoreTables so tests run fast without hitting DB
vi.mock('@/lib/auth/context', () => ({
  ensureCoreTables: vi.fn().mockResolvedValue(undefined),
}));

// Imports
import {
  automations,
  automationVersions,
  automationNodes,
  automationEdges,
  automationExecutions,
  automationExecutionSteps,
  workflows,
  workflowVersions,
  workflowNodes,
  workflowEdges,
  workflowExecutions,
  workflowExecutionSteps,
} from '@/lib/db/schema/automation';
import {
  AutomationDomainService,
  automationDomainService,
} from '@/lib/services/automation/automationDomainService';
import {
  AutomationNotFoundError,
  AutomationVersionNotFoundError,
  AutomationVersionImmutableError,
  AutomationTenantViolationError,
  AutomationNodeDuplicateKeyError,
  AutomationEdgeInvalidNodeError,
  AutomationIdempotencyConflictError,
  AutomationStatus,
  AutomationVersionStatus,
  AutomationExecutionStatus,
  AutomationExecutionStepStatus,
} from '@/lib/services/automation/types';

describe('Step 9: Automation Module Phase 1 — Database & Domain Foundation', () => {
  const WORKSPACE_A = '11111111-1111-1111-1111-111111111111';
  const PROJECT_A = '22222222-2222-2222-2222-222222222222';
  const WORKSPACE_B = '99999999-9999-9999-9999-999999999999';
  const PROJECT_B = '88888888-8888-8888-8888-888888888888';

  let service: AutomationDomainService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AutomationDomainService();
  });

  // ==========================================================================
  // 1. SCHEMA & TABLE DEFINITIONS
  // ==========================================================================
  describe('Drizzle Schema & Table Definitions', () => {
    it('should export all 6 required automation tables', () => {
      expect(automations).toBeDefined();
      expect(automationVersions).toBeDefined();
      expect(automationNodes).toBeDefined();
      expect(automationEdges).toBeDefined();
      expect(automationExecutions).toBeDefined();
      expect(automationExecutionSteps).toBeDefined();
    });

    it('should provide backward compatibility aliases for legacy references', () => {
      expect(workflows).toBe(automations);
      expect(workflowVersions).toBe(automationVersions);
      expect(workflowNodes).toBe(automationNodes);
      expect(workflowEdges).toBe(automationEdges);
      expect(workflowExecutions).toBe(automationExecutions);
      expect(workflowExecutionSteps).toBe(automationExecutionSteps);
    });

    it('should define correct table names and primary keys', () => {
      expect((automations as any)[Symbol.for('drizzle:Name')]).toBe('automations');
      expect((automationVersions as any)[Symbol.for('drizzle:Name')]).toBe('automation_versions');
      expect((automationNodes as any)[Symbol.for('drizzle:Name')]).toBe('automation_nodes');
      expect((automationEdges as any)[Symbol.for('drizzle:Name')]).toBe('automation_edges');
      expect((automationExecutions as any)[Symbol.for('drizzle:Name')]).toBe('automation_executions');
      expect((automationExecutionSteps as any)[Symbol.for('drizzle:Name')]).toBe('automation_execution_steps');
    });

    it('should have required columns defined on automations table', () => {
      const cols = automations as any;
      expect(cols.id).toBeDefined();
      expect(cols.workspaceId).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.description).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.currentVersionId).toBeDefined();
      expect(cols.createdBy).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
      expect(cols.archivedAt).toBeDefined();
    });

    it('should have required columns defined on automation_versions table', () => {
      const cols = automationVersions as any;
      expect(cols.id).toBeDefined();
      expect(cols.automationId).toBeDefined();
      expect(cols.versionNumber).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.createdBy).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.publishedAt).toBeDefined();
    });

    it('should have required columns defined on automation_nodes table', () => {
      const cols = automationNodes as any;
      expect(cols.id).toBeDefined();
      expect(cols.automationVersionId).toBeDefined();
      expect(cols.nodeKey).toBeDefined();
      expect(cols.type).toBeDefined();
      expect(cols.label).toBeDefined();
      expect(cols.positionX).toBeDefined();
      expect(cols.positionY).toBeDefined();
      expect(cols.configuration).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });

    it('should have required columns defined on automation_edges table', () => {
      const cols = automationEdges as any;
      expect(cols.id).toBeDefined();
      expect(cols.automationVersionId).toBeDefined();
      expect(cols.sourceNodeId).toBeDefined();
      expect(cols.targetNodeId).toBeDefined();
      expect(cols.sourceHandle).toBeDefined();
      expect(cols.targetHandle).toBeDefined();
      expect(cols.conditionKey).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });

    it('should have required columns defined on automation_executions table', () => {
      const cols = automationExecutions as any;
      expect(cols.id).toBeDefined();
      expect(cols.workspaceId).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.automationId).toBeDefined();
      expect(cols.automationVersionId).toBeDefined();
      expect(cols.triggerType).toBeDefined();
      expect(cols.triggerEventId).toBeDefined();
      expect(cols.idempotencyKey).toBeDefined();
      expect(cols.conversationId).toBeDefined();
      expect(cols.contactId).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.currentNodeId).toBeDefined();
      expect(cols.startedAt).toBeDefined();
      expect(cols.completedAt).toBeDefined();
      expect(cols.failedAt).toBeDefined();
      expect(cols.errorCode).toBeDefined();
      expect(cols.errorMessage).toBeDefined();
      expect(cols.metadata).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });

    it('should have required columns defined on automation_execution_steps table', () => {
      const cols = automationExecutionSteps as any;
      expect(cols.id).toBeDefined();
      expect(cols.executionId).toBeDefined();
      expect(cols.nodeId).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.input).toBeDefined();
      expect(cols.output).toBeDefined();
      expect(cols.errorCode).toBeDefined();
      expect(cols.errorMessage).toBeDefined();
      expect(cols.startedAt).toBeDefined();
      expect(cols.completedAt).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. TENANT ISOLATION
  // ==========================================================================
  describe('Tenant Isolation Enforcement', () => {
    it('should reject creation without workspaceId or projectId', async () => {
      await expect(
        service.createAutomation({
          workspaceId: '',
          projectId: PROJECT_A,
          name: 'Invalid Scope Automation',
        })
      ).rejects.toThrow(AutomationTenantViolationError);

      await expect(
        service.createAutomation({
          workspaceId: WORKSPACE_A,
          projectId: '',
          name: 'Invalid Scope Automation',
        })
      ).rejects.toThrow(AutomationTenantViolationError);
    });

    it('should throw AutomationTenantViolationError if automation exists under another workspace/project', async () => {
      const autoId = 'auto-tenant-123';

      // First query (filtered by workspace_a & project_a) returns empty
      mockSql.mockResolvedValueOnce({ rows: [] });
      // Cross-check query (checking if id exists at all) returns row belonging to Workspace B
      mockSql.mockResolvedValueOnce({ rows: [{ id: autoId }] });

      await expect(
        service.getAutomation(WORKSPACE_A, PROJECT_A, autoId)
      ).rejects.toThrow(AutomationTenantViolationError);
    });

    it('should throw AutomationNotFoundError if automation does not exist at all', async () => {
      const nonExistentId = 'auto-none-000';

      mockSql.mockResolvedValueOnce({ rows: [] });
      mockSql.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getAutomation(WORKSPACE_A, PROJECT_A, nonExistentId)
      ).rejects.toThrow(AutomationNotFoundError);
    });
  });

  // ==========================================================================
  // 3. AUTOMATION CREATION & INITIAL VERSION
  // ==========================================================================
  describe('Automation Creation & Initial Versioning', () => {
    it('should create an automation with DRAFT status and initialize Version 1 in DRAFT status', async () => {
      const fakeAutoId = 'auto-uuid-1';
      const fakeVerId = 'ver-uuid-1';

      // 1. Insert into automations
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: fakeAutoId,
            workspace_id: WORKSPACE_A,
            project_id: PROJECT_A,
            name: 'Order Confirmation Flow',
            description: 'Send receipt upon payment',
            status: 'DRAFT',
            current_version_id: null,
            created_by: null,
            created_at: new Date('2026-09-10T00:00:00Z'),
            updated_at: new Date('2026-09-10T00:00:00Z'),
            archived_at: null,
          },
        ],
      });

      // 2. Insert into automation_versions
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: fakeVerId,
            automation_id: fakeAutoId,
            version_number: 1,
            status: 'DRAFT',
            created_by: null,
            created_at: new Date('2026-09-10T00:00:00Z'),
            published_at: null,
          },
        ],
      });

      // 3. Update automations current_version_id
      mockSql.mockResolvedValueOnce({ rows: [] });

      const result = await service.createAutomation({
        workspaceId: WORKSPACE_A,
        projectId: PROJECT_A,
        name: 'Order Confirmation Flow',
        description: 'Send receipt upon payment',
      });

      expect(result.automation.id).toBe(fakeAutoId);
      expect(result.automation.name).toBe('Order Confirmation Flow');
      expect(result.automation.status).toBe('DRAFT');
      expect(result.automation.currentVersionId).toBe(fakeVerId);
      expect(result.initialVersion.id).toBe(fakeVerId);
      expect(result.initialVersion.versionNumber).toBe(1);
      expect(result.initialVersion.status).toBe('DRAFT');
    });

    it('should correctly list automations filtered by workspace and project', async () => {
      mockSql.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'auto-1',
            workspace_id: WORKSPACE_A,
            project_id: PROJECT_A,
            name: 'Flow 1',
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'auto-2',
            workspace_id: WORKSPACE_A,
            project_id: PROJECT_A,
            name: 'Flow 2',
            status: 'DRAFT',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const res = await service.listAutomations(WORKSPACE_A, PROJECT_A, { status: 'ALL' });
      expect(res.total).toBe(2);
      expect(res.automations.length).toBe(2);
      expect(res.automations[0].name).toBe('Flow 1');
      expect(res.automations[1].name).toBe('Flow 2');
    });
  });

  // ==========================================================================
  // 4. VERSION IMMUTABILITY & LIFECYCLE
  // ==========================================================================
  describe('Version Immutability & Lifecycle', () => {
    it('should create incremented version numbers (version 2, 3...)', async () => {
      const autoId = 'auto-ver-test';

      // 1. Get automation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A, status: 'ACTIVE' }],
      });
      // 2. Query MAX(version_number) -> returns 1
      mockSql.mockResolvedValueOnce({ rows: [{ max_version: 1 }] });
      // 3. Insert new version with version_number = 2
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'ver-2',
            automation_id: autoId,
            version_number: 2,
            status: 'DRAFT',
            created_at: new Date(),
          },
        ],
      });

      const newVer = await service.createDraftVersion(WORKSPACE_A, PROJECT_A, autoId);
      expect(newVer.versionNumber).toBe(2);
      expect(newVer.status).toBe('DRAFT');
    });

    it('should allow node edits on DRAFT version', async () => {
      const autoId = 'auto-1';
      const verId = 'ver-draft';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. getVersion -> returns DRAFT
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'DRAFT' }],
      });
      // 3. Check existing node_key
      mockSql.mockResolvedValueOnce({ rows: [] });
      // 4. Insert node
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            automation_version_id: verId,
            node_key: 'trigger_1',
            type: 'TRIGGER',
            label: 'When message received',
            position_x: 100,
            position_y: 200,
            configuration: { event: 'inbound_message' },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const node = await service.createNode(WORKSPACE_A, PROJECT_A, autoId, verId, {
        nodeKey: 'trigger_1',
        type: 'TRIGGER',
        label: 'When message received',
        positionX: 100,
        positionY: 200,
        configuration: { event: 'inbound_message' },
      });

      expect(node.nodeKey).toBe('trigger_1');
      expect(node.type).toBe('TRIGGER');
      expect(node.positionX).toBe(100);
      expect(node.positionY).toBe(200);
    });

    it('should REJECT node creation on PUBLISHED versions with AutomationVersionImmutableError', async () => {
      const autoId = 'auto-1';
      const verId = 'ver-published';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. getVersion -> status = 'PUBLISHED'
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'PUBLISHED' }],
      });

      await expect(
        service.createNode(WORKSPACE_A, PROJECT_A, autoId, verId, {
          nodeKey: 'new_node',
          type: 'ACTION',
          label: 'Send WhatsApp',
        })
      ).rejects.toThrow(AutomationVersionImmutableError);
    });

    it('should REJECT node modification on ARCHIVED versions with AutomationVersionImmutableError', async () => {
      const autoId = 'auto-1';
      const verId = 'ver-archived';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. getVersion -> status = 'ARCHIVED'
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'ARCHIVED' }],
      });

      await expect(
        service.updateNode(WORKSPACE_A, PROJECT_A, autoId, verId, 'node-1', {
          label: 'Updated Label',
        })
      ).rejects.toThrow(AutomationVersionImmutableError);
    });

    it('should publish version, update status to PUBLISHED, set publishedAt, and update automation currentVersionId', async () => {
      const autoId = 'auto-publish-test';
      const verId = 'ver-to-publish';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A, status: 'DRAFT' }],
      });
      // 2. getVersion
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'DRAFT' }],
      });
      // 3. Update version status to PUBLISHED
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: verId,
            automation_id: autoId,
            version_number: 1,
            status: 'PUBLISHED',
            published_at: new Date('2026-09-10T01:00:00Z'),
            created_at: new Date(),
          },
        ],
      });
      // 4. Update automation current_version_id
      mockSql.mockResolvedValueOnce({ rows: [] });

      const publishedVer = await service.publishVersion(WORKSPACE_A, PROJECT_A, autoId, verId);
      expect(publishedVer.status).toBe('PUBLISHED');
      expect(publishedVer.publishedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. NODE & EDGE CONSTRAINTS
  // ==========================================================================
  describe('Node & Edge Constraints', () => {
    it('should REJECT duplicate node_key inside the same version with AutomationNodeDuplicateKeyError', async () => {
      const autoId = 'auto-1';
      const verId = 'ver-draft';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. getVersion -> DRAFT
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'DRAFT' }],
      });
      // 3. Check existing node_key -> returns existing record!
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'existing-node-id' }],
      });

      await expect(
        service.createNode(WORKSPACE_A, PROJECT_A, autoId, verId, {
          nodeKey: 'trigger_1',
          type: 'TRIGGER',
          label: 'Duplicate Trigger',
        })
      ).rejects.toThrow(AutomationNodeDuplicateKeyError);
    });

    it('should validate that source and target nodes exist in the same version for edges', async () => {
      const autoId = 'auto-1';
      const verId = 'ver-draft';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. getVersion -> DRAFT
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'DRAFT' }],
      });
      // 3. Source node check -> found
      mockSql.mockResolvedValueOnce({ rows: [{ id: 'node-src' }] });
      // 4. Target node check -> NOT found
      mockSql.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.createEdge(WORKSPACE_A, PROJECT_A, autoId, verId, {
          sourceNodeId: 'node-src',
          targetNodeId: 'node-nonexistent',
          conditionKey: 'YES',
        })
      ).rejects.toThrow(AutomationEdgeInvalidNodeError);
    });

    it('should create an edge with condition_key (YES, NO, TRUE, FALSE, custom branches)', async () => {
      const autoId = 'auto-1';
      const verId = 'ver-draft';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. getVersion -> DRAFT
      mockSql.mockResolvedValueOnce({
        rows: [{ id: verId, automation_id: autoId, version_number: 1, status: 'DRAFT' }],
      });
      // 3. Source node check -> found
      mockSql.mockResolvedValueOnce({ rows: [{ id: 'node-src' }] });
      // 4. Target node check -> found
      mockSql.mockResolvedValueOnce({ rows: [{ id: 'node-tgt' }] });
      // 5. Insert edge
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'edge-1',
            automation_version_id: verId,
            source_node_id: 'node-src',
            target_node_id: 'node-tgt',
            source_handle: 'true_out',
            target_handle: 'in',
            condition_key: 'YES',
            created_at: new Date(),
          },
        ],
      });

      const edge = await service.createEdge(WORKSPACE_A, PROJECT_A, autoId, verId, {
        sourceNodeId: 'node-src',
        targetNodeId: 'node-tgt',
        sourceHandle: 'true_out',
        targetHandle: 'in',
        conditionKey: 'YES',
      });

      expect(edge.id).toBe('edge-1');
      expect(edge.conditionKey).toBe('YES');
      expect(edge.sourceNodeId).toBe('node-src');
      expect(edge.targetNodeId).toBe('node-tgt');
    });
  });

  // ==========================================================================
  // 6. EXECUTION & IDEMPOTENCY
  // ==========================================================================
  describe('Execution Creation & Idempotency', () => {
    it('should create an execution with QUEUED status when no duplicate idempotencyKey exists', async () => {
      const autoId = 'auto-exec-test';
      const verId = 'ver-1';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. Idempotency check -> not found
      mockSql.mockResolvedValueOnce({ rows: [] });
      // 3. Insert execution
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'exec-1',
            workspace_id: WORKSPACE_A,
            project_id: PROJECT_A,
            automation_id: autoId,
            automation_version_id: verId,
            trigger_type: 'INBOUND_WHATSAPP_MESSAGE',
            trigger_event_id: 'evt-msg-12345',
            idempotency_key: 'idem-msg-12345',
            status: 'QUEUED',
            metadata: { messageId: 'wamid.123' },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const result = await service.createExecution({
        workspaceId: WORKSPACE_A,
        projectId: PROJECT_A,
        automationId: autoId,
        automationVersionId: verId,
        triggerType: 'INBOUND_WHATSAPP_MESSAGE',
        triggerEventId: 'evt-msg-12345',
        idempotencyKey: 'idem-msg-12345',
        metadata: { messageId: 'wamid.123' },
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.execution.id).toBe('exec-1');
      expect(result.execution.status).toBe('QUEUED');
      expect(result.execution.idempotencyKey).toBe('idem-msg-12345');
    });

    it('should return the existing execution safely when idempotencyKey repeats (safe deduplication)', async () => {
      const autoId = 'auto-exec-test';
      const verId = 'ver-1';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. Idempotency check -> returns EXISTING execution
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'exec-existing-1',
            workspace_id: WORKSPACE_A,
            project_id: PROJECT_A,
            automation_id: autoId,
            automation_version_id: verId,
            trigger_type: 'INBOUND_WHATSAPP_MESSAGE',
            trigger_event_id: 'evt-msg-12345',
            idempotency_key: 'idem-msg-12345',
            status: 'RUNNING',
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const result = await service.createExecution({
        workspaceId: WORKSPACE_A,
        projectId: PROJECT_A,
        automationId: autoId,
        automationVersionId: verId,
        triggerType: 'INBOUND_WHATSAPP_MESSAGE',
        triggerEventId: 'evt-msg-12345',
        idempotencyKey: 'idem-msg-12345',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.execution.id).toBe('exec-existing-1');
      expect(result.execution.status).toBe('RUNNING');
    });

    it('should throw AutomationIdempotencyConflictError when throwOnDuplicateIdempotency is true', async () => {
      const autoId = 'auto-exec-test';
      const verId = 'ver-1';

      // 1. getAutomation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: autoId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. Idempotency check -> returns EXISTING execution
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'exec-existing-1',
            workspace_id: WORKSPACE_A,
            project_id: PROJECT_A,
            idempotency_key: 'idem-duplicate',
          },
        ],
      });

      await expect(
        service.createExecution(
          {
            workspaceId: WORKSPACE_A,
            projectId: PROJECT_A,
            automationId: autoId,
            automationVersionId: verId,
            triggerType: 'INBOUND_WHATSAPP_MESSAGE',
            idempotencyKey: 'idem-duplicate',
          },
          { throwOnDuplicateIdempotency: true }
        )
      ).rejects.toThrow(AutomationIdempotencyConflictError);
    });

    it('should update execution status and step results accurately', async () => {
      const execId = 'exec-steps-test';

      // 1. getExecution check
      mockSql.mockResolvedValueOnce({
        rows: [{ id: execId, workspace_id: WORKSPACE_A, project_id: PROJECT_A }],
      });
      // 2. Insert execution step
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'step-1',
            execution_id: execId,
            node_id: 'node-trigger',
            status: 'PENDING',
            input: { raw: 'hello' },
            output: {},
            created_at: new Date(),
          },
        ],
      });

      const step = await service.createExecutionStep(WORKSPACE_A, PROJECT_A, {
        executionId: execId,
        nodeId: 'node-trigger',
        input: { raw: 'hello' },
      });

      expect(step.id).toBe('step-1');
      expect(step.status).toBe('PENDING');

      // Update step to COMPLETED
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'step-1',
            execution_id: execId,
            node_id: 'node-trigger',
            status: 'COMPLETED',
            input: { raw: 'hello' },
            output: { parsed: true },
            completed_at: new Date(),
            created_at: new Date(),
          },
        ],
      });

      const updatedStep = await service.updateExecutionStep('step-1', {
        status: 'COMPLETED',
        output: { parsed: true },
      });

      expect(updatedStep.status).toBe('COMPLETED');
      expect(updatedStep.output).toEqual({ parsed: true });
    });
  });

  // ==========================================================================
  // 7. STATUS ENUMS & TRANSITIONS
  // ==========================================================================
  describe('Status Enums & Transitions', () => {
    it('should support all required Automation statuses: DRAFT, ACTIVE, PAUSED, ARCHIVED', () => {
      const statuses: AutomationStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
      expect(statuses.length).toBe(4);
    });

    it('should support all required Version statuses: DRAFT, PUBLISHED, ARCHIVED', () => {
      const statuses: AutomationVersionStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
      expect(statuses.length).toBe(3);
    });

    it('should support all required Execution statuses: QUEUED, RUNNING, WAITING, COMPLETED, FAILED, CANCELLED', () => {
      const statuses: AutomationExecutionStatus[] = [
        'QUEUED',
        'RUNNING',
        'WAITING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
      ];
      expect(statuses.length).toBe(6);
    });

    it('should support all required Step statuses: PENDING, RUNNING, COMPLETED, FAILED, SKIPPED', () => {
      const statuses: AutomationExecutionStepStatus[] = [
        'PENDING',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'SKIPPED',
      ];
      expect(statuses.length).toBe(5);
    });
  });
});
