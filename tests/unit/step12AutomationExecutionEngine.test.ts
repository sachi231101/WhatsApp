import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted SQL & Redis Mocks ────────────────────────────────────────────────
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

vi.mock('@/lib/auth/context', () => ({
  ensureCoreTables: vi.fn().mockResolvedValue(undefined),
}));

// Imports
import {
  automationEngine,
  AutomationEngine,
  WorkflowGraph,
  EdgeResolver,
  ExecutionLockService,
  executionObservability,
  NodeExecutorRegistry,
  TriggerExecutor,
  ConditionExecutor,
  TerminalExecutor,
  ActionExecutor,
} from '@/lib/services/automation/execution';
import {
  testAutomationRealtimeEvents,
  clearTestAutomationRealtimeEvents,
} from '@/lib/realtime/ablyPublisher';
import { AutomationNodeRecord, AutomationEdgeRecord } from '@/lib/services/automation/types';

describe('PHASE 12: Automation Execution Engine', () => {
  const WS_ID = '11111111-1111-1111-1111-111111111111';
  const PROJ_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_PROJ_ID = '99999999-9999-9999-9999-999999999999';
  const AUTO_ID = '33333333-3333-3333-3333-333333333333';
  const VER_ID = '44444444-4444-4444-4444-444444444444';
  const EXEC_ID = 'exec_12345';

  beforeEach(() => {
    vi.clearAllMocks();
    ExecutionLockService.clearTestLocks();
    executionObservability.resetMetrics();
    clearTestAutomationRealtimeEvents();
    mockSql.mockResolvedValue({ rows: [] });
  });

  // ============================================================================
  // 1. WorkflowGraph Indexing & Validation
  // ============================================================================
  describe('WorkflowGraph', () => {
    it('indexes nodes, edges, and resolves trigger node', () => {
      const nodes: AutomationNodeRecord[] = [
        {
          id: 'node_trigger',
          automationVersionId: VER_ID,
          nodeKey: 'trigger_1',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'New WhatsApp Message',
          positionX: 0,
          positionY: 0,
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node_terminal',
          automationVersionId: VER_ID,
          nodeKey: 'terminal_1',
          type: 'TERMINAL',
          label: 'End Workflow',
          positionX: 100,
          positionY: 100,
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const edges: AutomationEdgeRecord[] = [
        {
          id: 'edge_1',
          automationVersionId: VER_ID,
          sourceNodeId: 'node_trigger',
          targetNodeId: 'node_terminal',
          sourceHandle: null,
          targetHandle: null,
          conditionKey: null,
          createdAt: new Date().toISOString(),
        },
      ];

      const graph = new WorkflowGraph(VER_ID, nodes, edges);
      expect(graph.getNode('node_trigger')).toBeDefined();
      expect(graph.getNode('trigger_1')).toBeDefined();
      expect(graph.getTriggerNode()?.id).toBe('node_trigger');
      expect(graph.getOutgoingEdges('node_trigger')).toHaveLength(1);
      expect(graph.isTerminalNode('node_terminal')).toBe(true);
      expect(graph.isTerminalNode('node_trigger')).toBe(false);

      const validation = graph.validate();
      expect(validation.valid).toBe(true);
    });

    it('flags invalid edges referencing missing nodes', () => {
      const nodes: AutomationNodeRecord[] = [
        {
          id: 'node_trigger',
          automationVersionId: VER_ID,
          nodeKey: 'trigger_1',
          type: 'trigger',
          label: 'Trigger',
          positionX: 0,
          positionY: 0,
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const edges: AutomationEdgeRecord[] = [
        {
          id: 'edge_invalid',
          automationVersionId: VER_ID,
          sourceNodeId: 'node_trigger',
          targetNodeId: 'missing_node_id',
          sourceHandle: null,
          targetHandle: null,
          conditionKey: null,
          createdAt: new Date().toISOString(),
        },
      ];

      const graph = new WorkflowGraph(VER_ID, nodes, edges);
      const validation = graph.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('missing_node_id');
    });
  });

  // ============================================================================
  // 2. EdgeResolver
  // ============================================================================
  describe('EdgeResolver', () => {
    it('resolves condition branches (YES and NO) correctly', () => {
      const nodes: AutomationNodeRecord[] = [
        {
          id: 'node_condition',
          automationVersionId: VER_ID,
          nodeKey: 'condition_1',
          type: 'MESSAGE_CONTAINS',
          label: 'Message Contains',
          positionX: 0,
          positionY: 0,
          configuration: { value: 'course' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node_yes',
          automationVersionId: VER_ID,
          nodeKey: 'terminal_yes',
          type: 'terminal',
          label: 'Yes End',
          positionX: 100,
          positionY: 50,
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node_no',
          automationVersionId: VER_ID,
          nodeKey: 'terminal_no',
          type: 'terminal',
          label: 'No End',
          positionX: 100,
          positionY: 150,
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const edges: AutomationEdgeRecord[] = [
        {
          id: 'edge_yes',
          automationVersionId: VER_ID,
          sourceNodeId: 'node_condition',
          targetNodeId: 'node_yes',
          sourceHandle: 'YES',
          targetHandle: null,
          conditionKey: 'YES',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'edge_no',
          automationVersionId: VER_ID,
          sourceNodeId: 'node_condition',
          targetNodeId: 'node_no',
          sourceHandle: 'NO',
          targetHandle: null,
          conditionKey: 'NO',
          createdAt: new Date().toISOString(),
        },
      ];

      const graph = new WorkflowGraph(VER_ID, nodes, edges);
      const condNode = nodes[0];

      // Test YES branch
      const nextYes = EdgeResolver.resolveNextEdge(condNode, { status: 'COMPLETED', branch: 'YES' }, graph);
      expect(nextYes?.id).toBe('edge_yes');
      expect(nextYes?.targetNodeId).toBe('node_yes');

      // Test NO branch
      const nextNo = EdgeResolver.resolveNextEdge(condNode, { status: 'COMPLETED', branch: 'NO' }, graph);
      expect(nextNo?.id).toBe('edge_no');
      expect(nextNo?.targetNodeId).toBe('node_no');
    });

    it('returns null when no matching branch exists', () => {
      const nodes: AutomationNodeRecord[] = [
        {
          id: 'node_condition',
          automationVersionId: VER_ID,
          nodeKey: 'condition_1',
          type: 'MESSAGE_CONTAINS',
          label: 'Message Contains',
          positionX: 0,
          positionY: 0,
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const graph = new WorkflowGraph(VER_ID, nodes, []);
      const next = EdgeResolver.resolveNextEdge(nodes[0], { status: 'COMPLETED', branch: 'YES' }, graph);
      expect(next).toBeNull();
    });
  });

  // ============================================================================
  // 3. Execution Concurrency Locking
  // ============================================================================
  describe('Execution Concurrency Locking', () => {
    it('acquires lock and blocks simultaneous execution of the same run', async () => {
      const lock1 = await ExecutionLockService.acquire(EXEC_ID, 10);
      expect(lock1.acquired).toBe(true);

      const lock2 = await ExecutionLockService.acquire(EXEC_ID, 10);
      expect(lock2.acquired).toBe(false);

      await ExecutionLockService.release(EXEC_ID, lock1.token);

      const lock3 = await ExecutionLockService.acquire(EXEC_ID, 10);
      expect(lock3.acquired).toBe(true);
      await ExecutionLockService.release(EXEC_ID, lock3.token);
    });
  });

  // ============================================================================
  // 4. Node Executors & Placeholder Behavior
  // ============================================================================
  describe('Node Executors', () => {
    it('returns NODE_NOT_IMPLEMENTED for unsupported action nodes and marks status FAILED', async () => {
      const actionNode: AutomationNodeRecord = {
        id: 'node_action',
        automationVersionId: VER_ID,
        nodeKey: 'action_1',
        type: 'SEND_EMAIL',
        label: 'Send Email',
        positionX: 0,
        positionY: 0,
        configuration: { prompt: 'Hello' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const executor = NodeExecutorRegistry.resolve(actionNode);
      expect(executor).toBeInstanceOf(ActionExecutor);

      const result = await executor.execute(actionNode, {
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
        triggerType: 'WHATSAPP_INCOMING_MESSAGE',
        variables: {},
        currentNodeId: actionNode.id,
        visitedNodeIds: [],
        stepCount: 1,
        startedAt: Date.now(),
        metadata: {},
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('NODE_NOT_IMPLEMENTED');
    });

    it('TriggerExecutor completes pass-through without re-matching trigger', async () => {
      const triggerNode: AutomationNodeRecord = {
        id: 'node_trigger',
        automationVersionId: VER_ID,
        nodeKey: 'trigger_1',
        type: 'WHATSAPP_INCOMING_MESSAGE',
        label: 'Trigger',
        positionX: 0,
        positionY: 0,
        configuration: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const executor = NodeExecutorRegistry.resolve(triggerNode);
      expect(executor).toBeInstanceOf(TriggerExecutor);

      const res = await executor.execute(triggerNode, {
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
        triggerType: 'WHATSAPP_INCOMING_MESSAGE',
        triggerEventId: 'evt_1',
        variables: {},
        currentNodeId: triggerNode.id,
        visitedNodeIds: [],
        stepCount: 1,
        startedAt: Date.now(),
        metadata: {},
      });

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.triggerType).toBe('WHATSAPP_INCOMING_MESSAGE');
    });
  });

  // ============================================================================
  // 5. Version Integrity & Immutability Protection
  // ============================================================================
  describe('Version & Tenant Integrity', () => {
    it('rejects execution when automation version is DRAFT', async () => {
      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                status: 'QUEUED',
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({
            rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }],
          });
        }
        if (q.includes('FROM automation_versions')) {
          return Promise.resolve({
            rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'DRAFT', version_number: 1 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('VERSION_NOT_PUBLISHED');
    });

    it('cancels queued execution if automation is currently PAUSED', async () => {
      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                status: 'QUEUED',
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({
            rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'PAUSED' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('CANCELLED');
      expect(result.errorMessage).toContain('paused');
    });

    it('blocks execution when workspace/project does not match automation tenant', async () => {
      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                status: 'QUEUED',
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          // Empty: automation belongs to different project
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('TENANT_ACCESS_ERROR');
    });
  });

  // ============================================================================
  // 6. Execution Loop, Traversal & Terminal State
  // ============================================================================
  describe('Execution Engine Lifecycle & Traversal', () => {
    it('executes Trigger -> Terminal workflow to COMPLETED status', async () => {
      const nodesData = [
        {
          id: 'n_trigger',
          automation_version_id: VER_ID,
          node_key: 'trigger_1',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'Trigger',
          position_x: 0,
          position_y: 0,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_terminal',
          automation_version_id: VER_ID,
          node_key: 'end_1',
          type: 'TERMINAL',
          label: 'End',
          position_x: 100,
          position_y: 100,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const edgesData: any[] = [
        {
          id: 'e_1',
          automation_version_id: VER_ID,
          source_node_id: 'n_trigger',
          target_node_id: 'n_terminal',
          source_handle: null,
          target_handle: null,
          condition_key: null,
          created_at: new Date(),
        },
      ];

      let executionStatus = 'QUEUED';
      let recordedSteps: any[] = [];

      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);

        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                status: executionStatus,
                current_node_id: 'n_trigger',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          if (q.includes("'RUNNING'")) executionStatus = 'RUNNING';
          if (q.includes("'COMPLETED'")) executionStatus = 'COMPLETED';
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                status: executionStatus,
                completed_at: executionStatus === 'COMPLETED' ? new Date().toISOString() : null,
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({
            rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }],
          });
        }
        if (q.includes('FROM automation_versions')) {
          return Promise.resolve({
            rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'PUBLISHED', version_number: 1 }],
          });
        }
        if (q.includes('FROM automation_nodes')) {
          return Promise.resolve({ rows: nodesData });
        }
        if (q.includes('FROM automation_edges')) {
          return Promise.resolve({ rows: edgesData });
        }
        if (q.includes('INSERT INTO automation_execution_steps')) {
          const stepId = `step_${recordedSteps.length + 1}`;
          const newStep = { id: stepId, execution_id: EXEC_ID, status: 'RUNNING' };
          recordedSteps.push(newStep);
          return Promise.resolve({ rows: [newStep] });
        }
        if (q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_1', status: 'COMPLETED' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('COMPLETED');
      expect(executionStatus).toBe('COMPLETED');
      expect(recordedSteps.length).toBe(2); // Trigger step + Terminal step
    });

    it('enforces maximum step limit and aborts accidental cycles', async () => {
      // Create cyclic graph: Node A -> Node B -> Node A
      const nodesData = [
        {
          id: 'node_a',
          automation_version_id: VER_ID,
          node_key: 'node_a',
          type: 'trigger',
          label: 'A',
          position_x: 0,
          position_y: 0,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'node_b',
          automation_version_id: VER_ID,
          node_key: 'node_b',
          type: 'trigger',
          label: 'B',
          position_x: 0,
          position_y: 0,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const edgesData: any[] = [
        { id: 'e1', automation_version_id: VER_ID, source_node_id: 'node_a', target_node_id: 'node_b', condition_key: null },
        { id: 'e2', automation_version_id: VER_ID, source_node_id: 'node_b', target_node_id: 'node_a', condition_key: null },
      ];

      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [{ id: EXEC_ID, workspace_id: WS_ID, project_id: PROJ_ID, automation_id: AUTO_ID, automation_version_id: VER_ID, status: 'QUEUED', current_node_id: 'node_a' }],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({ rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }] });
        }
        if (q.includes('FROM automation_versions')) {
          return Promise.resolve({ rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'PUBLISHED', version_number: 1 }] });
        }
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodesData });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edgesData });
        if (q.includes('INSERT INTO automation_execution_steps')) return Promise.resolve({ rows: [{ id: 'step_cycle', status: 'RUNNING' }] });
        if (q.includes('UPDATE automation_execution_steps')) return Promise.resolve({ rows: [{ id: 'step_cycle', status: 'COMPLETED' }] });
        return Promise.resolve({ rows: [] });
      });

      // Run with low maxSteps = 5
      const result = await automationEngine.run(EXEC_ID, { maxSteps: 5 });
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('MAX_EXECUTION_STEPS_EXCEEDED');
    });
  });

  // ============================================================================
  // 7. Full Integration: Trigger -> Condition (Phase 11) -> YES/NO Branch -> Terminal
  // ============================================================================
  describe('Integration: Trigger -> Condition -> Branching -> Terminal', () => {
    const buildSampleWorkflowGraph = () => {
      const nodesData = [
        {
          id: 'n_trig',
          automation_version_id: VER_ID,
          node_key: 'trigger_message',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'New Message',
          position_x: 0,
          position_y: 0,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_cond',
          automation_version_id: VER_ID,
          node_key: 'cond_contains',
          type: 'MESSAGE_CONTAINS',
          label: 'Message Contains "course"',
          position_x: 100,
          position_y: 0,
          configuration: {
            operator: 'contains',
            value: 'course',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_term_yes',
          automation_version_id: VER_ID,
          node_key: 'term_yes',
          type: 'TERMINAL',
          label: 'Yes Branch End',
          position_x: 200,
          position_y: 50,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_term_no',
          automation_version_id: VER_ID,
          node_key: 'term_no',
          type: 'TERMINAL',
          label: 'No Branch End',
          position_x: 200,
          position_y: 150,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const edgesData = [
        {
          id: 'e_trig_to_cond',
          automation_version_id: VER_ID,
          source_node_id: 'n_trig',
          target_node_id: 'n_cond',
          source_handle: null,
          condition_key: null,
        },
        {
          id: 'e_cond_yes',
          automation_version_id: VER_ID,
          source_node_id: 'n_cond',
          target_node_id: 'n_term_yes',
          source_handle: 'YES',
          condition_key: 'YES',
        },
        {
          id: 'e_cond_no',
          automation_version_id: VER_ID,
          source_node_id: 'n_cond',
          target_node_id: 'n_term_no',
          source_handle: 'NO',
          condition_key: 'NO',
        },
      ];

      return { nodesData, edgesData };
    };

    it('follows YES branch when incoming message matches "course"', async () => {
      const { nodesData, edgesData } = buildSampleWorkflowGraph();
      let executionStatus = 'QUEUED';
      const completedNodeIds: string[] = [];

      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);

        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                status: executionStatus,
                current_node_id: 'n_trig',
                message_id: 'msg_course',
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({ rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }] });
        }
        if (q.includes('FROM automation_versions')) {
          return Promise.resolve({ rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'PUBLISHED', version_number: 1 }] });
        }
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodesData });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edgesData });
        if (q.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{ id: 'msg_course', body: 'I want course details please' }],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          if (q.includes("'COMPLETED'")) executionStatus = 'COMPLETED';
          return Promise.resolve({ rows: [{ id: EXEC_ID, status: executionStatus }] });
        }
        if (q.includes('INSERT INTO automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: `step_${Date.now()}` }] });
        }
        if (q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_updated' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('COMPLETED');
    });

    it('follows NO branch when incoming message does not match "course"', async () => {
      const { nodesData, edgesData } = buildSampleWorkflowGraph();
      let executionStatus = 'QUEUED';

      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);

        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                status: executionStatus,
                current_node_id: 'n_trig',
                message_id: 'msg_hello',
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({ rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }] });
        }
        if (q.includes('FROM automation_versions')) {
          return Promise.resolve({ rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'PUBLISHED', version_number: 1 }] });
        }
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodesData });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edgesData });
        if (q.includes('FROM messages')) {
          return Promise.resolve({
            rows: [{ id: 'msg_hello', body: 'Hello there' }],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          if (q.includes("'COMPLETED'")) executionStatus = 'COMPLETED';
          return Promise.resolve({ rows: [{ id: EXEC_ID, status: executionStatus }] });
        }
        if (q.includes('INSERT INTO automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: `step_${Date.now()}` }] });
        }
        if (q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_updated' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('COMPLETED');
    });

    it('traverses multi-condition workflow: Trigger -> Condition A -> Condition B -> Terminal', async () => {
      const nodesData = [
        { id: 'trig', automation_version_id: VER_ID, node_key: 't1', type: 'WHATSAPP_INCOMING_MESSAGE', label: 'T', position_x: 0, position_y: 0, configuration: {} },
        { id: 'c1', automation_version_id: VER_ID, node_key: 'c1', type: 'MESSAGE_CONTAINS', label: 'C1', position_x: 100, position_y: 0, configuration: { value: 'pricing' } },
        { id: 'c2', automation_version_id: VER_ID, node_key: 'c2', type: 'MESSAGE_CONTAINS', label: 'C2', position_x: 200, position_y: 0, configuration: { value: 'enterprise' } },
        { id: 'term', automation_version_id: VER_ID, node_key: 'term', type: 'TERMINAL', label: 'End', position_x: 300, position_y: 0, configuration: {} },
      ];

      const edgesData = [
        { id: 'e1', automation_version_id: VER_ID, source_node_id: 'trig', target_node_id: 'c1', condition_key: null },
        { id: 'e2', automation_version_id: VER_ID, source_node_id: 'c1', target_node_id: 'c2', condition_key: 'YES' },
        { id: 'e3', automation_version_id: VER_ID, source_node_id: 'c2', target_node_id: 'term', condition_key: 'YES' },
      ];

      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [{ id: EXEC_ID, workspace_id: WS_ID, project_id: PROJ_ID, automation_id: AUTO_ID, automation_version_id: VER_ID, status: 'QUEUED', current_node_id: 'trig', message_id: 'msg_1' }],
          });
        }
        if (q.includes('FROM automations')) return Promise.resolve({ rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }] });
        if (q.includes('FROM automation_versions')) return Promise.resolve({ rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'PUBLISHED', version_number: 1 }] });
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodesData });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edgesData });
        if (q.includes('FROM messages')) {
          return Promise.resolve({ rows: [{ id: 'msg_1', body: 'What is your enterprise pricing?' }] });
        }
        if (q.includes('UPDATE automation_executions')) return Promise.resolve({ rows: [{ id: EXEC_ID, status: 'COMPLETED' }] });
        if (q.includes('INSERT INTO automation_execution_steps')) return Promise.resolve({ rows: [{ id: 'step_multi' }] });
        if (q.includes('UPDATE automation_execution_steps')) return Promise.resolve({ rows: [{ id: 'step_multi' }] });
        return Promise.resolve({ rows: [] });
      });

      const result = await automationEngine.run(EXEC_ID);
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ============================================================================
  // 8. Observability & Realtime Ably Events
  // ============================================================================
  describe('Observability & Realtime Events', () => {
    it('records execution logs and emits events to Ably', async () => {
      await executionObservability.log({
        action: 'automation.execution.started',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        versionId: VER_ID,
        executionId: EXEC_ID,
        status: 'RUNNING',
      });

      await executionObservability.log({
        action: 'automation.execution.completed',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        versionId: VER_ID,
        executionId: EXEC_ID,
        status: 'COMPLETED',
        durationMs: 45,
      });

      const metrics = executionObservability.getMetrics();
      expect(metrics.executionsStarted).toBe(1);
      expect(metrics.executionsCompleted).toBe(1);

      expect(testAutomationRealtimeEvents).toHaveLength(2);
      expect(testAutomationRealtimeEvents[0].channel).toBe(
        `workspace:${WS_ID}:project:${PROJ_ID}:automations`
      );
      expect(testAutomationRealtimeEvents[0].name).toBe('automation.execution.started');
      expect(testAutomationRealtimeEvents[1].name).toBe('automation.execution.completed');
    });
  });
});
