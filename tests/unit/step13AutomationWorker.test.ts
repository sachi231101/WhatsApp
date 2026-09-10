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
  processAutomationExecutionJob,
  AutomationExecutionWorker,
  automationExecutionWorker,
  startAutomationWorker,
  stopAutomationWorker,
  getAutomationWorkerHealth,
  PERMANENT_EXECUTION_ERROR_CODES,
} from '@/lib/queue/automationExecutionWorker';
import {
  enqueueAutomationExecution,
  testEnqueuedAutomationJobs,
  clearTestAutomationJobs,
  getAutomationQueueMetrics,
  closeAutomationExecutionQueue,
} from '@/lib/queue/automationExecutionQueue';
import {
  automationReconciliationService,
} from '@/lib/services/automation/execution/automationReconciliationService';
import {
  ExecutionLockService,
  executionObservability,
} from '@/lib/services/automation/execution';

describe('PHASE 13: BullMQ Automation Worker & Durable Execution', () => {
  const WS_ID = '11111111-1111-1111-1111-111111111111';
  const PROJ_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_WS_ID = '88888888-8888-8888-8888-888888888888';
  const OTHER_PROJ_ID = '99999999-9999-9999-9999-999999999999';
  const AUTO_ID = '33333333-3333-3333-3333-333333333333';
  const VER_ID = '44444444-4444-4444-4444-444444444444';
  const VER_2_ID = '55555555-5555-5555-5555-555555555555';
  const EXEC_ID = 'exec_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
    ExecutionLockService.clearTestLocks();
    executionObservability.resetMetrics();
    clearTestAutomationJobs();
    mockSql.mockResolvedValue({ rows: [] });
  });

  // ============================================================================
  // 1. Queue Enqueue & Deterministic Job IDs
  // ============================================================================
  describe('Queue Enqueue & Deterministic Job IDs', () => {
    it('enqueues execution job with minimal payload and deterministic job ID', async () => {
      const result = await enqueueAutomationExecution({
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      expect(result.enqueued).toBe(true);
      expect(result.id).toBe(`automation-execution:${EXEC_ID}`);
      expect(testEnqueuedAutomationJobs.length).toBe(1);
      expect(testEnqueuedAutomationJobs[0].data.executionId).toBe(EXEC_ID);
      expect(testEnqueuedAutomationJobs[0].data.workspaceId).toBe(WS_ID);
    });

    it('returns queue metrics with zero defaults when in test mode', async () => {
      const metrics = await getAutomationQueueMetrics();
      expect(metrics).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });

    it('closes queue cleanly without errors', async () => {
      await expect(closeAutomationExecutionQueue()).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Canonical DB Validation & Tenant Security
  // ============================================================================
  describe('Canonical DB Verification & Tenant Security', () => {
    it('fails safely if execution record does not exist in database', async () => {
      mockSql.mockResolvedValue({ rows: [] });

      const result = await processAutomationExecutionJob({
        executionId: 'non_existent_exec',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('EXECUTION_NOT_FOUND');
      expect(result.permanent).toBe(true);
    });

    it('rejects cross-tenant execution when queue payload does not match DB tenant', async () => {
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
        if (q.includes('UPDATE automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                status: 'FAILED',
                error_code: 'TENANT_ACCESS_ERROR',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      // Pass fraudulent workspace ID in payload
      const result = await processAutomationExecutionJob({
        executionId: EXEC_ID,
        workspaceId: OTHER_WS_ID,
        projectId: OTHER_PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('TENANT_ACCESS_ERROR');
      expect(result.permanent).toBe(true);
    });
  });

  // ============================================================================
  // 3. Idempotency & Duplicate Delivery Protection
  // ============================================================================
  describe('Idempotency & Duplicate Delivery', () => {
    it('skips execution if already in COMPLETED status', async () => {
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
                status: 'COMPLETED',
                current_node_id: null,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await processAutomationExecutionJob({
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.status).toBe('COMPLETED');
    });

    it('skips execution if already in CANCELLED status', async () => {
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
                status: 'CANCELLED',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await processAutomationExecutionJob({
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.status).toBe('CANCELLED');
    });

    it('cancels queued execution if automation is paused before worker starts', async () => {
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
          return Promise.resolve({
            rows: [{ id: AUTO_ID, status: 'PAUSED' }],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          return Promise.resolve({
            rows: [{ id: EXEC_ID, status: 'CANCELLED' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await processAutomationExecutionJob({
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      expect(result.success).toBe(true);
      expect(result.cancelled).toBe(true);
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ============================================================================
  // 4. Concurrency & Execution Locking
  // ============================================================================
  describe('Concurrency & Lock Handling', () => {
    it('detects lock conflict when another worker is running the same execution', async () => {
      // Simulate another worker holding the lock
      await ExecutionLockService.acquire(EXEC_ID);

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
                status: 'RUNNING',
                current_node_id: 'node_in_progress',
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          return Promise.resolve({
            rows: [{ id: AUTO_ID, status: 'ACTIVE' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await processAutomationExecutionJob({
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      // Exits cleanly without duplicating work
      expect(result.success).toBe(true);
      expect(result.locked).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  // ============================================================================
  // 5. Version Immutability & Workflow Execution
  // ============================================================================
  describe('Version Immutability & Full Worker Execution', () => {
    it('executes original version V1 even if a new version V2 has been published', async () => {
      const nodesV1 = [
        {
          id: 'n_trig',
          automation_version_id: VER_ID,
          node_key: 'trig_1',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'Trigger',
          position_x: 0,
          position_y: 0,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_end',
          automation_version_id: VER_ID,
          node_key: 'end_1',
          type: 'TERMINAL',
          label: 'End V1',
          position_x: 100,
          position_y: 100,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const edgesV1: any[] = [
        {
          id: 'e1',
          automation_version_id: VER_ID,
          source_node_id: 'n_trig',
          target_node_id: 'n_end',
          source_handle: null,
          target_handle: null,
          condition_key: null,
          created_at: new Date(),
        },
      ];

      let execStatus = 'QUEUED';

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
                // Tied to Version 1
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                status: execStatus,
                current_node_id: 'n_trig',
                metadata: {},
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          if (q.includes("'RUNNING'")) execStatus = 'RUNNING';
          if (q.includes("'COMPLETED'")) execStatus = 'COMPLETED';
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                status: execStatus,
                completed_at: execStatus === 'COMPLETED' ? new Date().toISOString() : null,
              },
            ],
          });
        }
        if (q.includes('FROM automations')) {
          // Automation currently points to newer V2 as current_version_id
          return Promise.resolve({
            rows: [
              {
                id: AUTO_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                status: 'ACTIVE',
                current_version_id: VER_2_ID,
              },
            ],
          });
        }
        if (q.includes('FROM automation_versions')) {
          // Querying VER_ID
          return Promise.resolve({
            rows: [{ id: VER_ID, automation_id: AUTO_ID, status: 'PUBLISHED', version_number: 1 }],
          });
        }
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodesV1 });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edgesV1 });
        if (q.includes('INSERT INTO automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_1', status: 'RUNNING' }] });
        }
        if (q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_1', status: 'COMPLETED' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockJob: any = { id: 'job-1', attemptsMade: 0 };
      const result = await processAutomationExecutionJob(
        {
          executionId: EXEC_ID,
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          automationId: AUTO_ID,
          automationVersionId: VER_ID,
        },
        mockJob
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ============================================================================
  // 6. Worker Crash Recovery & Resumption
  // ============================================================================
  describe('Worker Crash Recovery & Resumption', () => {
    it('resumes from current_node_id when previous worker crashed during RUNNING state', async () => {
      const nodesData = [
        {
          id: 'n_cond',
          automation_version_id: VER_ID,
          node_key: 'cond_1',
          type: 'MESSAGE_CONTAINS',
          label: 'Contains Course',
          position_x: 0,
          position_y: 0,
          configuration: { phrases: ['course'], operator: 'contains' },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_terminal',
          automation_version_id: VER_ID,
          node_key: 'term_1',
          type: 'TERMINAL',
          label: 'Course End',
          position_x: 100,
          position_y: 100,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const edgesData: any[] = [
        {
          id: 'e_yes',
          automation_version_id: VER_ID,
          source_node_id: 'n_cond',
          target_node_id: 'n_terminal',
          source_handle: 'YES',
          target_handle: null,
          condition_key: 'YES',
          created_at: new Date(),
        },
      ];

      let execStatus = 'RUNNING';

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
                // Crashed worker left status RUNNING with current_node_id = 'n_cond'
                status: execStatus,
                current_node_id: 'n_cond',
                metadata: {
                  message: { text: 'I want this course now' },
                },
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          if (q.includes("'COMPLETED'")) execStatus = 'COMPLETED';
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                status: execStatus,
                completed_at: execStatus === 'COMPLETED' ? new Date().toISOString() : null,
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
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodesData });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edgesData });
        if (q.includes('INSERT INTO automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_resumed', status: 'RUNNING' }] });
        }
        if (q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_resumed', status: 'COMPLETED' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockJob: any = { id: 'job-resume', attemptsMade: 1 };
      const result = await processAutomationExecutionJob(
        {
          executionId: EXEC_ID,
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          automationId: AUTO_ID,
          automationVersionId: VER_ID,
        },
        mockJob
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ============================================================================
  // 7. Error Classification: Permanent vs Transient
  // ============================================================================
  describe('Error Classification: Permanent vs Transient', () => {
    it('classifies unsupported action as permanent failure and does not trigger BullMQ retry', async () => {
      const nodesData = [
        {
          id: 'n_trig',
          automation_version_id: VER_ID,
          node_key: 'trig_1',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'Trigger',
          position_x: 0,
          position_y: 0,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'n_unsupported',
          automation_version_id: VER_ID,
          node_key: 'unsupported_action',
          type: 'SEND_WHATSAPP_MESSAGE', // Unsupported in Phase 13
          label: 'Send WhatsApp',
          position_x: 100,
          position_y: 100,
          configuration: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const edgesData: any[] = [
        {
          id: 'e1',
          automation_version_id: VER_ID,
          source_node_id: 'n_trig',
          target_node_id: 'n_unsupported',
          source_handle: null,
          target_handle: null,
          condition_key: null,
          created_at: new Date(),
        },
      ];

      let execStatus = 'QUEUED';

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
                status: execStatus,
                current_node_id: 'n_trig',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          if (q.includes("'RUNNING'")) execStatus = 'RUNNING';
          if (q.includes("'FAILED'")) execStatus = 'FAILED';
          return Promise.resolve({
            rows: [
              {
                id: EXEC_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                status: execStatus,
                error_code: 'NODE_NOT_IMPLEMENTED',
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
        if (q.includes('INSERT INTO automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 's1', status: 'RUNNING' }] });
        }
        if (q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 's1', status: 'FAILED' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await processAutomationExecutionJob({
        executionId: EXEC_ID,
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
      });

      // Does not throw an exception; finishes cleanly with permanent: true
      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('NODE_NOT_IMPLEMENTED');
      expect(result.permanent).toBe(true);
      expect(PERMANENT_EXECUTION_ERROR_CODES.has('NODE_NOT_IMPLEMENTED')).toBe(true);
    });
  });

  // ============================================================================
  // 8. Automation Reconciliation Service
  // ============================================================================
  describe('AutomationReconciliationService', () => {
    it('re-enqueues orphaned QUEUED executions older than threshold', async () => {
      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes("status = 'QUEUED'")) {
          return Promise.resolve({
            rows: [
              {
                id: 'orphan_1',
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                current_node_id: 'n_start',
              },
              {
                id: 'orphan_2',
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                current_node_id: 'n_start',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const requeued = await automationReconciliationService.reconcileOrphanQueuedExecutions({
        olderThanMinutes: 5,
      });

      expect(requeued).toBe(2);
      expect(testEnqueuedAutomationJobs.length).toBe(2);
      expect(testEnqueuedAutomationJobs[0].data.executionId).toBe('orphan_1');
      expect(testEnqueuedAutomationJobs[1].data.executionId).toBe('orphan_2');
    });

    it('recovers stalled RUNNING executions whose lock has expired', async () => {
      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes("status = 'RUNNING'")) {
          return Promise.resolve({
            rows: [
              {
                id: 'stalled_1',
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                current_node_id: 'node_midpoint',
                started_at: new Date(Date.now() - 15 * 60000).toISOString(),
                updated_at: new Date(Date.now() - 15 * 60000).toISOString(),
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await automationReconciliationService.reconcileStaleRunningExecutions({
        staleMinutes: 10,
        maxRunMinutes: 30,
      });

      expect(res.recovered).toBe(1);
      expect(res.timedOut).toBe(0);
      expect(testEnqueuedAutomationJobs.length).toBe(1);
      expect(testEnqueuedAutomationJobs[0].data.executionId).toBe('stalled_1');
    });

    it('marks running execution as TIMEOUT if it exceeded maxRunMinutes', async () => {
      mockSql.mockImplementation((strings: any) => {
        const q = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (q.includes('FROM automation_executions')) {
          return Promise.resolve({
            rows: [
              {
                id: 'timeout_1',
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                automation_id: AUTO_ID,
                automation_version_id: VER_ID,
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                current_node_id: 'node_loop',
                status: 'RUNNING',
                // Started 45 minutes ago (exceeds maxRunMinutes=30)
                started_at: new Date(Date.now() - 45 * 60000).toISOString(),
                updated_at: new Date(Date.now() - 45 * 60000).toISOString(),
              },
            ],
          });
        }
        if (q.includes('UPDATE automation_executions')) {
          return Promise.resolve({
            rows: [{ id: 'timeout_1', status: 'FAILED', error_code: 'EXECUTION_TIMEOUT' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await automationReconciliationService.reconcileStaleRunningExecutions({
        staleMinutes: 10,
        maxRunMinutes: 30,
      });

      expect(res.recovered).toBe(0);
      expect(res.timedOut).toBe(1);
    });
  });

  // ============================================================================
  // 9. Worker Lifecycle, Graceful Shutdown & Health Check
  // ============================================================================
  describe('Worker Lifecycle & Graceful Shutdown', () => {
    it('reports worker health accurately', () => {
      const health = getAutomationWorkerHealth();
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.concurrency).toBe('number');
      expect(typeof health.isRedisAvailable).toBe('boolean');
    });

    it('handles stopAutomationWorker gracefully', async () => {
      await expect(stopAutomationWorker(500)).resolves.toBeUndefined();
    });

    it('AutomationExecutionWorker class can instantiate and query concurrency', () => {
      const workerInstance = new AutomationExecutionWorker();
      expect(workerInstance.concurrency).toBeGreaterThan(0);
      expect(workerInstance.isHealthy()).toBe(false); // test mode, not running
    });
  });
});
