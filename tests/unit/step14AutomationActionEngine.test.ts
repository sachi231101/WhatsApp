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

vi.mock('@/lib/realtime/ablyPublisher', () => ({
  publishInboxEvent: vi.fn().mockResolvedValue(undefined),
  publishContactEvent: vi.fn().mockResolvedValue(undefined),
  publishAutomationRealtimeEvent: vi.fn().mockResolvedValue(undefined),
  testAutomationRealtimeEvents: [],
  clearTestAutomationRealtimeEvents: vi.fn(),
}));

vi.mock('@/lib/queue/outboundQueue', () => ({
  enqueueOutboundMessage: vi.fn().mockResolvedValue({ jobId: 'job_mock' }),
}));

// Imports
import {
  AddTagExecutor,
  RemoveTagExecutor,
  UpdateContactExecutor,
  AssignAgentExecutor,
  ChangeConversationStatusExecutor,
  SendInternalNoteExecutor,
  CreateTaskExecutor,
  ActionExecutorRegistry,
  ActionExecutor,
  ActionIdempotencyService,
  VariableResolver,
  NodeExecutorRegistry,
  automationEngine,
  ExecutionContext,
} from '@/lib/services/automation/execution';
import { automationTriggerService } from '@/lib/services/automation/automationTriggerService';
import { enqueueOutboundMessage } from '@/lib/queue/outboundQueue';
import { AutomationNodeRecord, AutomationEdgeRecord } from '@/lib/services/automation/types';

describe('PHASE 14: Automation Action Engine', () => {
  const WS_ID = '11111111-1111-1111-1111-111111111111';
  const PROJ_ID = '22222222-2222-2222-2222-222222222222';
  const AUTO_ID = '33333333-3333-3333-3333-333333333333';
  const VER_ID = '44444444-4444-4444-4444-444444444444';
  const EXEC_ID = 'exec_test_14';
  const CONTACT_ID = '55555555-5555-5555-5555-555555555555';
  const CONV_ID = '66666666-6666-6666-6666-666666666666';
  const USER_ID = '77777777-7777-7777-7777-777777777777';
  const TAG_ID = '88888888-8888-8888-8888-888888888888';

  function createNode(def: Partial<AutomationNodeRecord> & { id: string; type: string }): AutomationNodeRecord {
    return {
      id: def.id,
      automationVersionId: def.automationVersionId || VER_ID,
      nodeKey: def.nodeKey || def.id,
      type: def.type,
      label: def.label || def.type,
      positionX: def.positionX ?? 0,
      positionY: def.positionY ?? 0,
      configuration: def.configuration || {},
      createdAt: def.createdAt || new Date().toISOString(),
      updatedAt: def.updatedAt || new Date().toISOString(),
    };
  }

  function createEdge(def: Partial<AutomationEdgeRecord> & { id: string; sourceNodeId: string; targetNodeId: string }): AutomationEdgeRecord {
    return {
      id: def.id,
      automationVersionId: def.automationVersionId || VER_ID,
      sourceNodeId: def.sourceNodeId,
      targetNodeId: def.targetNodeId,
      sourceHandle: def.sourceHandle || null,
      targetHandle: def.targetHandle || null,
      conditionKey: def.conditionKey || null,
      createdAt: def.createdAt || new Date().toISOString(),
    };
  }

  const baseContext: ExecutionContext = {
    executionId: EXEC_ID,
    workspaceId: WS_ID,
    projectId: PROJ_ID,
    automationId: AUTO_ID,
    automationVersionId: VER_ID,
    triggerType: 'WHATSAPP_INCOMING_MESSAGE',
    contactId: CONTACT_ID,
    conversationId: CONV_ID,
    messageId: 'msg_123',
    variables: {
      contact: {
        firstName: 'Sarah',
        lastName: 'Connor',
        displayName: 'Sarah Connor',
        email: 'sarah@example.com',
        company: 'Cyberdyne',
      },
      message: {
        text: 'I want to enroll in the course',
        company: 'Skynet',
      },
    },
    currentNodeId: 'node_action_1',
    visitedNodeIds: [],
    stepCount: 1,
    startedAt: Date.now(),
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ActionIdempotencyService.clearTestRecords();
    ActionExecutorRegistry.clearCustomExecutors();
  });

  // ==========================================================================
  // 1. VariableResolver Unit Tests
  // ==========================================================================
  describe('VariableResolver', () => {
    it('resolves {{contact.firstName}} and {{message.text}} placeholders', () => {
      const template = 'Follow up with {{contact.firstName}} regarding "{{message.text}}"';
      const resolved = VariableResolver.resolveString(template, baseContext);
      expect(resolved).toBe('Follow up with Sarah regarding "I want to enroll in the course"');
    });

    it('resolves snake_case placeholders e.g. {{contact.first_name}}', () => {
      const template = 'Hello {{contact.first_name}}!';
      const resolved = VariableResolver.resolveString(template, baseContext);
      expect(resolved).toBe('Hello Sarah!');
    });

    it('replaces missing variables with empty string deterministically', () => {
      const template = 'Missing: {{nonexistent.field}}';
      const resolved = VariableResolver.resolveString(template, baseContext);
      expect(resolved).toBe('Missing: ');
    });

    it('redacts sensitive keys / secrets', () => {
      const ctxWithSecrets: ExecutionContext = {
        ...baseContext,
        variables: {
          ...baseContext.variables,
          auth: { token: 'secret_jwt_token', password: 'secret_password' },
        },
      };
      const template = 'Token is {{auth.token}} and pass is {{auth.password}}';
      const resolved = VariableResolver.resolveString(template, ctxWithSecrets);
      expect(resolved).toBe('Token is  and pass is ');
    });

    it('recursively resolves template strings in nested objects', () => {
      const inputObj = {
        title: 'Task for {{contact.firstName}}',
        details: {
          note: 'From {{message.company}}',
          count: 42,
        },
      };
      const resolved = VariableResolver.resolveObject(inputObj, baseContext);
      expect(resolved).toEqual({
        title: 'Task for Sarah',
        details: {
          note: 'From Skynet',
          count: 42,
        },
      });
    });
  });

  // ==========================================================================
  // 2. ActionIdempotencyService Unit Tests
  // ==========================================================================
  describe('ActionIdempotencyService', () => {
    it('generates consistent logical key: workspaceId:projectId:executionId:nodeId', () => {
      const key = ActionIdempotencyService.generateKey(WS_ID, PROJ_ID, EXEC_ID, 'node_1');
      expect(key).toBe(`${WS_ID}:${PROJ_ID}:${EXEC_ID}:node_1`);
    });

    it('records and returns cached action execution result', async () => {
      await ActionIdempotencyService.record({
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        executionId: EXEC_ID,
        nodeId: 'node_1',
        actionType: 'ADD_TAG',
        sideEffectId: 'tag_123',
        output: { added: true },
      });

      const existing = await ActionIdempotencyService.get(WS_ID, PROJ_ID, EXEC_ID, 'node_1');
      expect(existing).not.toBeNull();
      expect(existing?.actionType).toBe('ADD_TAG');
      expect(existing?.sideEffectId).toBe('tag_123');
      expect(existing?.output).toEqual({ added: true });
    });

    it('distinguishes different executions on the same node', async () => {
      await ActionIdempotencyService.record({
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        executionId: 'exec_A',
        nodeId: 'node_1',
        actionType: 'ADD_TAG',
      });

      const execB = await ActionIdempotencyService.get(WS_ID, PROJ_ID, 'exec_B', 'node_1');
      expect(execB).toBeNull();
    });
  });

  // ==========================================================================
  // 3. ADD_TAG Action Tests
  // ==========================================================================
  describe('ADD_TAG Action Executor', () => {
    it('successfully adds tag to contact via TagService', async () => {
      const mockTagService = {
        getContactTags: vi.fn().mockResolvedValue([]),
        addTagToContact: vi.fn().mockResolvedValue(true),
        getProjectTags: vi.fn().mockResolvedValue([]),
      } as any;

      const executor = new AddTagExecutor(mockTagService);
      const node = createNode({
        id: 'node_tag_1',
        nodeKey: 'tag_1',
        type: 'ADD_TAG',
        label: 'Add VIP Tag',
        configuration: { tagId: TAG_ID },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.alreadyPresent).toBe(false);
      expect(mockTagService.addTagToContact).toHaveBeenCalledWith(
        WS_ID,
        PROJ_ID,
        CONTACT_ID,
        TAG_ID,
        EXEC_ID,
        'automation'
      );
    });

    it('is a safe no-op if tag is already present on contact', async () => {
      const mockTagService = {
        getContactTags: vi.fn().mockResolvedValue([{ id: TAG_ID, name: 'VIP' }]),
        addTagToContact: vi.fn(),
      } as any;

      const executor = new AddTagExecutor(mockTagService);
      const node = createNode({
        id: 'node_tag_1',
        nodeKey: 'tag_1',
        type: 'ADD_TAG',
        label: 'Add VIP Tag',
        configuration: { tagId: TAG_ID },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.alreadyPresent).toBe(true);
      expect(mockTagService.addTagToContact).not.toHaveBeenCalled();
    });

    it('fails cleanly if contact is missing from context', async () => {
      const executor = new AddTagExecutor();
      const node = createNode({
        id: 'node_tag_1',
        nodeKey: 'tag_1',
        type: 'ADD_TAG',
        label: 'Add VIP Tag',
        configuration: { tagId: TAG_ID },
      });

      const result = await executor.execute(node, { ...baseContext, contactId: null });
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_CONFIGURATION');
    });

    it('fails cleanly if tag belongs to another project or does not exist', async () => {
      const mockTagService = {
        getContactTags: vi.fn().mockRejectedValue(new Error('Tag not found or does not belong to this project.')),
      } as any;

      const executor = new AddTagExecutor(mockTagService);
      const node = createNode({
        id: 'node_tag_1',
        nodeKey: 'tag_1',
        type: 'ADD_TAG',
        label: 'Add VIP Tag',
        configuration: { tagId: 'foreign_tag' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });

  // ==========================================================================
  // 4. REMOVE_TAG Action Tests
  // ==========================================================================
  describe('REMOVE_TAG Action Executor', () => {
    it('successfully removes existing tag from contact', async () => {
      const mockTagService = {
        getContactTags: vi.fn().mockResolvedValue([{ id: TAG_ID, name: 'Lead' }]),
        removeTagFromContact: vi.fn().mockResolvedValue(true),
      } as any;

      const executor = new RemoveTagExecutor(mockTagService);
      const node = createNode({
        id: 'node_rm_1',
        nodeKey: 'rm_1',
        type: 'REMOVE_TAG',
        label: 'Remove Lead Tag',
        configuration: { tagId: TAG_ID },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.wasPresent).toBe(true);
      expect(mockTagService.removeTagFromContact).toHaveBeenCalledWith(
        WS_ID,
        PROJ_ID,
        CONTACT_ID,
        TAG_ID,
        EXEC_ID,
        'automation'
      );
    });

    it('is a safe no-op if tag is already absent', async () => {
      const mockTagService = {
        getContactTags: vi.fn().mockResolvedValue([]),
        removeTagFromContact: vi.fn(),
      } as any;

      const executor = new RemoveTagExecutor(mockTagService);
      const node = createNode({
        id: 'node_rm_1',
        nodeKey: 'rm_1',
        type: 'REMOVE_TAG',
        label: 'Remove Tag',
        configuration: { tagId: TAG_ID },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.wasPresent).toBe(false);
      expect(mockTagService.removeTagFromContact).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 5. UPDATE_CONTACT Action Tests
  // ==========================================================================
  describe('UPDATE_CONTACT Action Executor', () => {
    it('updates standard contact fields with variable resolution', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({
          id: CONTACT_ID,
          firstName: 'Old',
          lastName: 'Name',
          email: 'old@example.com',
          company: 'OldCo',
          status: 'INACTIVE',
          leadScore: 10,
        }),
        updateContact: vi.fn().mockResolvedValue({}),
      } as any;

      const executor = new UpdateContactExecutor(mockContactService);
      const node = createNode({
        id: 'node_upd_1',
        nodeKey: 'upd_1',
        type: 'UPDATE_CONTACT',
        label: 'Update to Active Lead',
        configuration: {
          fields: {
            company: '{{message.company}}',
            status: 'ACTIVE',
            leadScore: 75,
          },
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.changedFields).toContain('company');
      expect(result.output?.changedFields).toContain('status');
      expect(result.output?.changedFields).toContain('leadScore');

      expect(mockContactService.updateContact).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Skynet',
          status: 'ACTIVE',
          leadScore: 75,
        })
      );
    });

    it('rejects invalid email with INVALID_FIELD', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({
          id: CONTACT_ID,
          email: 'old@example.com',
        }),
      } as any;

      const executor = new UpdateContactExecutor(mockContactService);
      const node = createNode({
        id: 'node_upd_1',
        nodeKey: 'upd_1',
        type: 'UPDATE_CONTACT',
        label: 'Bad Email',
        configuration: {
          email: 'not-an-email',
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_FIELD');
    });

    it('rejects invalid lead score with INVALID_FIELD', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({ id: CONTACT_ID, leadScore: 50 }),
      } as any;

      const executor = new UpdateContactExecutor(mockContactService);
      const node = createNode({
        id: 'node_upd_1',
        nodeKey: 'upd_1',
        type: 'UPDATE_CONTACT',
        label: 'Bad Score',
        configuration: {
          leadScore: 150, // Out of range [0, 100]
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_FIELD');
    });

    it('rejects invalid status with INVALID_STATUS', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({ id: CONTACT_ID, status: 'ACTIVE' }),
      } as any;

      const executor = new UpdateContactExecutor(mockContactService);
      const node = createNode({
        id: 'node_upd_1',
        nodeKey: 'upd_1',
        type: 'UPDATE_CONTACT',
        label: 'Bad Status',
        configuration: {
          status: 'INVALID_ENUM_VAL',
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_STATUS');
    });

    it('rejects custom field from another project with RESOURCE_NOT_FOUND', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({ id: CONTACT_ID }),
      } as any;
      const mockCustomFieldService = {
        getFieldDefinitions: vi.fn().mockResolvedValue([{ id: 'valid_field', key: 'tier' }]),
      } as any;

      const executor = new UpdateContactExecutor(mockContactService, mockCustomFieldService);
      const node = createNode({
        id: 'node_upd_1',
        nodeKey: 'upd_1',
        type: 'UPDATE_CONTACT',
        label: 'Custom Field Update',
        configuration: {
          customFields: {
            foreign_field_id: 'Diamond',
          },
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('RESOURCE_NOT_FOUND');
    });

    it('is a safe no-op if fields are already equal', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({
          id: CONTACT_ID,
          company: 'Skynet',
          status: 'ACTIVE',
        }),
        updateContact: vi.fn(),
      } as any;

      const executor = new UpdateContactExecutor(mockContactService);
      const node = createNode({
        id: 'node_upd_1',
        nodeKey: 'upd_1',
        type: 'UPDATE_CONTACT',
        label: 'No-op update',
        configuration: {
          company: '{{message.company}}', // Skynet
          status: 'ACTIVE',
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.changedFields).toEqual([]);
      expect(mockContactService.updateContact).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 6. ASSIGN_AGENT Action Tests
  // ==========================================================================
  describe('ASSIGN_AGENT Action Executor', () => {
    it('successfully assigns conversation to active team member', async () => {
      const mockInboxService = {
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          assigned_user_id: null,
        }),
        assignConversation: vi.fn().mockResolvedValue({ success: true }),
      } as any;

      mockSql.mockResolvedValueOnce({
        rows: [{ user_id: USER_ID, name: 'Agent John' }],
      });

      const executor = new AssignAgentExecutor(mockInboxService);
      const node = createNode({
        id: 'node_assign_1',
        nodeKey: 'assign_1',
        type: 'ASSIGN_AGENT',
        label: 'Assign to Agent John',
        configuration: { userId: USER_ID },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.assignedTo).toBe(USER_ID);
      expect(result.output?.alreadyAssigned).toBe(false);
      expect(mockInboxService.assignConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONV_ID,
          targetUserId: USER_ID,
        })
      );
    });

    it('supports unassigning conversation (userId: null or UNASSIGN)', async () => {
      const mockInboxService = {
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          assigned_user_id: USER_ID,
        }),
        assignConversation: vi.fn().mockResolvedValue({ success: true }),
      } as any;

      const executor = new AssignAgentExecutor(mockInboxService);
      const node = createNode({
        id: 'node_assign_1',
        nodeKey: 'assign_1',
        type: 'ASSIGN_AGENT',
        label: 'Unassign Agent',
        configuration: { assignmentType: 'UNASSIGN' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.assignedTo).toBeNull();
      expect(mockInboxService.assignConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONV_ID,
          targetUserId: null,
        })
      );
    });

    it('is a safe no-op if conversation is already assigned to the target user', async () => {
      const mockInboxService = {
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          assigned_user_id: USER_ID,
        }),
        assignConversation: vi.fn(),
      } as any;

      const executor = new AssignAgentExecutor(mockInboxService);
      const node = createNode({
        id: 'node_assign_1',
        nodeKey: 'assign_1',
        type: 'ASSIGN_AGENT',
        label: 'Assign to Agent',
        configuration: { userId: USER_ID },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.alreadyAssigned).toBe(true);
      expect(mockInboxService.assignConversation).not.toHaveBeenCalled();
    });

    it('rejects user from another workspace with UNAUTHORIZED_RESOURCE', async () => {
      const mockInboxService = {
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          assigned_user_id: null,
        }),
      } as any;

      mockSql.mockResolvedValueOnce({ rows: [] }); // User not found in workspace_members

      const executor = new AssignAgentExecutor(mockInboxService);
      const node = createNode({
        id: 'node_assign_1',
        nodeKey: 'assign_1',
        type: 'ASSIGN_AGENT',
        label: 'Assign to Foreign User',
        configuration: { userId: 'foreign_user_999' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('UNAUTHORIZED_RESOURCE');
    });
  });

  // ==========================================================================
  // 7. CHANGE_CONVERSATION_STATUS Action Tests
  // ==========================================================================
  describe('CHANGE_CONVERSATION_STATUS Action Executor', () => {
    it('successfully changes status to RESOLVED', async () => {
      const mockInboxService = {
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          status: 'open',
        }),
        updateConversationStatus: vi.fn().mockResolvedValue({ success: true }),
      } as any;

      const executor = new ChangeConversationStatusExecutor(mockInboxService);
      const node = createNode({
        id: 'node_status_1',
        nodeKey: 'status_1',
        type: 'CHANGE_CONVERSATION_STATUS',
        label: 'Resolve Conversation',
        configuration: { status: 'RESOLVED' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.status).toBe('RESOLVED');
      expect(result.output?.previousStatus).toBe('OPEN');
      expect(mockInboxService.updateConversationStatus).toHaveBeenCalledWith({
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        conversationId: CONV_ID,
        status: 'resolved',
      });
    });

    it('is a safe no-op if conversation already has target status', async () => {
      const mockInboxService = {
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          status: 'resolved',
        }),
        updateConversationStatus: vi.fn(),
      } as any;

      const executor = new ChangeConversationStatusExecutor(mockInboxService);
      const node = createNode({
        id: 'node_status_1',
        nodeKey: 'status_1',
        type: 'CHANGE_CONVERSATION_STATUS',
        label: 'Resolve Conversation',
        configuration: { status: 'RESOLVED' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.alreadyInStatus).toBe(true);
      expect(mockInboxService.updateConversationStatus).not.toHaveBeenCalled();
    });

    it('rejects invalid status enum with INVALID_STATUS', async () => {
      const executor = new ChangeConversationStatusExecutor();
      const node = createNode({
        id: 'node_status_1',
        nodeKey: 'status_1',
        type: 'CHANGE_CONVERSATION_STATUS',
        label: 'Bad Status',
        configuration: { status: 'UNKNOWN_STATUS_XYZ' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_STATUS');
    });
  });

  // ==========================================================================
  // 8. SEND_INTERNAL_NOTE Action Tests
  // ==========================================================================
  describe('SEND_INTERNAL_NOTE Action Executor', () => {
    it('creates internal note with variable interpolation and NEVER calls outbound WhatsApp queue', async () => {
      mockSql
        // 1. Conversation check
        .mockResolvedValueOnce({ rows: [{ id: CONV_ID }] })
        // 2. Existing note idempotency check
        .mockResolvedValueOnce({ rows: [] })
        // 3. Insert note
        .mockResolvedValueOnce({
          rows: [{ id: 'note_123', content: 'Follow up with Sarah Connor', created_at: new Date().toISOString() }],
        });

      const executor = new SendInternalNoteExecutor();
      const node = createNode({
        id: 'node_note_1',
        nodeKey: 'note_1',
        type: 'SEND_INTERNAL_NOTE',
        label: 'Leave Internal Note',
        configuration: {
          text: 'Follow up with {{contact.first_name}} {{contact.last_name}}',
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.content).toBe('Follow up with Sarah Connor');
      expect(result.sideEffectId).toBe('note_123');

      // Crucial Safety Assertion: Internal note NEVER enters customer-facing WhatsApp queue
      expect(enqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects empty note content with INVALID_CONFIGURATION', async () => {
      const executor = new SendInternalNoteExecutor();
      const node = createNode({
        id: 'node_note_1',
        nodeKey: 'note_1',
        type: 'SEND_INTERNAL_NOTE',
        label: 'Empty Note',
        configuration: { text: '   ' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_CONFIGURATION');
    });

    it('is idempotent on worker retry if note already exists for executionId + nodeId', async () => {
      mockSql
        .mockResolvedValueOnce({ rows: [{ id: CONV_ID }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'note_existing', content: 'Existing Note', created_at: new Date().toISOString() }],
        });

      const executor = new SendInternalNoteExecutor();
      const node = createNode({
        id: 'node_note_1',
        nodeKey: 'note_1',
        type: 'SEND_INTERNAL_NOTE',
        label: 'Retry Note',
        configuration: { text: 'Retry content' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.deduplicated).toBe(true);
      expect(result.sideEffectId).toBe('note_existing');
    });
  });

  // ==========================================================================
  // 9. CREATE_TASK Action Tests
  // ==========================================================================
  describe('CREATE_TASK Action Executor', () => {
    it('creates CRM task with variable resolution and due date calculation', async () => {
      const mockTaskService = {
        createTask: vi.fn().mockResolvedValue({
          task: {
            id: 'task_abc',
            title: 'Call Sarah Connor',
            assigneeUserId: USER_ID,
          },
          deduplicated: false,
        }),
      } as any;

      const executor = new CreateTaskExecutor(mockTaskService);
      const node = createNode({
        id: 'node_task_1',
        nodeKey: 'task_1',
        type: 'CREATE_TASK',
        label: 'Create Lead Follow-up Task',
        configuration: {
          title: 'Call {{contact.first_name}} {{contact.last_name}}',
          description: 'Regarding: {{message.text}}',
          dueInHours: 24,
          assignee: USER_ID,
          priority: 'high',
        },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.taskId).toBe('task_abc');
      expect(result.output?.title).toBe('Call Sarah Connor');

      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          title: 'Call Sarah Connor',
          description: 'Regarding: I want to enroll in the course',
          assigneeUserId: USER_ID,
          priority: 'high',
          source: 'AUTOMATION',
          idempotencyKey: `task:${EXEC_ID}:node_task_1`,
        })
      );
    });

    it('rejects empty title with INVALID_CONFIGURATION', async () => {
      const executor = new CreateTaskExecutor();
      const node = createNode({
        id: 'node_task_1',
        nodeKey: 'task_1',
        type: 'CREATE_TASK',
        label: 'Empty Task',
        configuration: { title: '' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_CONFIGURATION');
    });

    it('handles worker retry deduplication cleanly', async () => {
      const mockTaskService = {
        createTask: vi.fn().mockResolvedValue({
          task: { id: 'task_abc', title: 'Call Sarah Connor' },
          deduplicated: true,
        }),
      } as any;

      const executor = new CreateTaskExecutor(mockTaskService);
      const node = createNode({
        id: 'node_task_1',
        nodeKey: 'task_1',
        type: 'CREATE_TASK',
        label: 'Retry Task',
        configuration: { title: 'Call Sarah' },
      });

      const result = await executor.execute(node, baseContext);
      expect(result.status).toBe('COMPLETED');
      expect(result.output?.deduplicated).toBe(true);
    });
  });

  // ==========================================================================
  // 10. ActionExecutor & Registry Integration
  // ==========================================================================
  describe('ActionExecutor & Registry Integration', () => {
    it('ActionExecutor delegates to registered action executor and records idempotency', async () => {
      const mockAddTag = {
        execute: vi.fn().mockResolvedValue({
          status: 'COMPLETED',
          output: { action: 'ADD_TAG', tagId: TAG_ID },
          sideEffectId: `tag_${TAG_ID}`,
        }),
      };
      ActionExecutorRegistry.register('ADD_TAG', mockAddTag as any);

      const actionExecutor = new ActionExecutor();
      const node = createNode({
        id: 'node_1',
        nodeKey: 'k1',
        type: 'ADD_TAG',
        label: 'Add Tag',
        configuration: { tagId: TAG_ID },
      });

      // First run
      const result1 = await actionExecutor.execute(node, baseContext);
      expect(result1.status).toBe('COMPLETED');
      expect(mockAddTag.execute).toHaveBeenCalledTimes(1);

      // Second run (Worker retry simulation) -> should be deduplicated via ActionIdempotencyService
      const result2 = await actionExecutor.execute(node, baseContext);
      expect(result2.status).toBe('COMPLETED');
      expect(result2.output?.deduplicated).toBe(true);
      expect(mockAddTag.execute).toHaveBeenCalledTimes(1); // Not called again!
    });

    it('returns NODE_NOT_IMPLEMENTED for unimplemented actions (e.g. SEND_EMAIL)', async () => {
      const actionExecutor = new ActionExecutor();
      const node = createNode({
        id: 'node_email',
        nodeKey: 'email_1',
        type: 'SEND_EMAIL',
        label: 'Send Email',
      });

      const result = await actionExecutor.execute(node, baseContext);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('NODE_NOT_IMPLEMENTED');
    });

    it('NodeExecutorRegistry resolves action nodes to ActionExecutor', () => {
      const actionTypes = [
        'ADD_TAG',
        'REMOVE_TAG',
        'UPDATE_CONTACT',
        'ASSIGN_AGENT',
        'CHANGE_CONVERSATION_STATUS',
        'SEND_INTERNAL_NOTE',
        'CREATE_TASK',
      ];

      for (const t of actionTypes) {
        const executor = NodeExecutorRegistry.resolve(
          createNode({
            id: 'n',
            nodeKey: 'k',
            type: t,
            label: t,
          })
        );
        expect(executor.category).toBe('ACTION');
      }
    });
  });

  // ==========================================================================
  // 11. Event Recursion & Infinite Loop Protection
  // ==========================================================================
  describe('Event Recursion & Loop Protection', () => {
    it('suppresses self-trigger loop when originAutomationId matches automation ID', async () => {
      mockSql
        // 1. Tenant check
        .mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] })
        // 2. Active automations
        .mockResolvedValueOnce({
          rows: [
            {
              id: AUTO_ID,
              workspace_id: WS_ID,
              project_id: PROJ_ID,
              name: 'Tag Loop Automation',
              status: 'ACTIVE',
              current_version_id: VER_ID,
            },
          ],
        });

      const event = {
        id: 'evt_1',
        type: 'contact.tag_added',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { contactId: CONTACT_ID, tagId: TAG_ID },
        metadata: {
          source: 'automation',
          originAutomationId: AUTO_ID, // Self-triggering!
        },
      };

      const summary = await automationTriggerService.handle(event);
      expect(summary.matchedCount).toBe(0);
    });

    it('suppresses cyclic loop when automation ID is already in eventChain', async () => {
      mockSql
        .mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: AUTO_ID,
              workspace_id: WS_ID,
              project_id: PROJ_ID,
              name: 'Looping Automation',
              status: 'ACTIVE',
              current_version_id: VER_ID,
            },
          ],
        });

      const event = {
        id: 'evt_2',
        type: 'contact.tag_added',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { contactId: CONTACT_ID, tagId: TAG_ID },
        metadata: {
          source: 'automation',
          originAutomationId: 'some_other_auto',
          eventChain: ['auto_1', AUTO_ID, 'auto_2'], // Cycle!
        },
      };

      const summary = await automationTriggerService.handle(event);
      expect(summary.matchedCount).toBe(0);
    });

    it('suppresses event if eventChain depth limit (>=5) is reached', async () => {
      mockSql
        .mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: AUTO_ID,
              workspace_id: WS_ID,
              project_id: PROJ_ID,
              name: 'Deep Automation',
              status: 'ACTIVE',
              current_version_id: VER_ID,
            },
          ],
        });

      const event = {
        id: 'evt_3',
        type: 'contact.tag_added',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { contactId: CONTACT_ID, tagId: TAG_ID },
        metadata: {
          source: 'automation',
          originAutomationId: 'root_auto',
          eventChain: ['a1', 'a2', 'a3', 'a4', 'a5'], // Length 5
        },
      };

      const summary = await automationTriggerService.handle(event);
      expect(summary.matchedCount).toBe(0);
    });
  });

  // ==========================================================================
  // 12. Full Multi-Action End-to-End Workflow Traversal
  // ==========================================================================
  describe('Full Multi-Action End-to-End Workflow Execution', () => {
    it('executes sequential actions across domain services and completes workflow', async () => {
      // Build a workflow with: Trigger -> AddTag -> UpdateContact -> AssignAgent -> ChangeStatus -> Note -> End
      const nodes: AutomationNodeRecord[] = [
        createNode({
          id: 'n_trig',
          nodeKey: 'trig',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'Incoming Message',
        }),
        createNode({
          id: 'n_tag',
          nodeKey: 'tag',
          type: 'ADD_TAG',
          label: 'Add Tag',
          configuration: { tagId: TAG_ID },
        }),
        createNode({
          id: 'n_upd',
          nodeKey: 'upd',
          type: 'UPDATE_CONTACT',
          label: 'Update Contact',
          configuration: { fields: { company: '{{message.company}}' } },
        }),
        createNode({
          id: 'n_assign',
          nodeKey: 'assign',
          type: 'ASSIGN_AGENT',
          label: 'Assign Agent',
          configuration: { userId: USER_ID },
        }),
        createNode({
          id: 'n_status',
          nodeKey: 'status',
          type: 'CHANGE_CONVERSATION_STATUS',
          label: 'Change Status',
          configuration: { status: 'OPEN' },
        }),
        createNode({
          id: 'n_note',
          nodeKey: 'note',
          type: 'SEND_INTERNAL_NOTE',
          label: 'Internal Note',
          configuration: { text: 'Automated follow-up note for {{contact.firstName}}' },
        }),
        createNode({
          id: 'n_end',
          nodeKey: 'end',
          type: 'TERMINAL',
          label: 'Workflow End',
        }),
      ];

      const edges: AutomationEdgeRecord[] = [
        createEdge({
          id: 'e1',
          automationVersionId: VER_ID,
          sourceNodeId: 'n_trig',
          targetNodeId: 'n_tag',
        }),
        createEdge({
          id: 'e2',
          automationVersionId: VER_ID,
          sourceNodeId: 'n_tag',
          targetNodeId: 'n_upd',
        }),
        createEdge({
          id: 'e3',
          automationVersionId: VER_ID,
          sourceNodeId: 'n_upd',
          targetNodeId: 'n_assign',
        }),
        createEdge({
          id: 'e4',
          automationVersionId: VER_ID,
          sourceNodeId: 'n_assign',
          targetNodeId: 'n_status',
        }),
        createEdge({
          id: 'e5',
          automationVersionId: VER_ID,
          sourceNodeId: 'n_status',
          targetNodeId: 'n_note',
        }),
        createEdge({
          id: 'e6',
          automationVersionId: VER_ID,
          sourceNodeId: 'n_note',
          targetNodeId: 'n_end',
        }),
      ];

      // Mock DB for automationEngine.run
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
                trigger_type: 'WHATSAPP_INCOMING_MESSAGE',
                contact_id: CONTACT_ID,
                conversation_id: CONV_ID,
                current_node_id: null,
                metadata: {
                  triggerContext: {
                    variables: {
                      contact: { firstName: 'Sarah', lastName: 'Connor' },
                      message: { company: 'Skynet' },
                    },
                  },
                },
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
        if (q.includes('FROM automation_nodes')) return Promise.resolve({ rows: nodes });
        if (q.includes('FROM automation_edges')) return Promise.resolve({ rows: edges });
        if (q.includes('UPDATE automation_executions')) {
          return Promise.resolve({ rows: [{ id: EXEC_ID, status: 'COMPLETED' }] });
        }
        if (q.includes('INSERT INTO automation_execution_steps') || q.includes('UPDATE automation_execution_steps')) {
          return Promise.resolve({ rows: [{ id: 'step_mock' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Register mock action executors in registry to assert each is called
      const calledActions: string[] = [];
      ActionExecutorRegistry.register('ADD_TAG', {
        execute: vi.fn().mockImplementation(async () => {
          calledActions.push('ADD_TAG');
          return { status: 'COMPLETED', output: { added: true } };
        }),
      });
      ActionExecutorRegistry.register('UPDATE_CONTACT', {
        execute: vi.fn().mockImplementation(async () => {
          calledActions.push('UPDATE_CONTACT');
          return { status: 'COMPLETED', output: { updated: true } };
        }),
      });
      ActionExecutorRegistry.register('ASSIGN_AGENT', {
        execute: vi.fn().mockImplementation(async () => {
          calledActions.push('ASSIGN_AGENT');
          return { status: 'COMPLETED', output: { assigned: true } };
        }),
      });
      ActionExecutorRegistry.register('CHANGE_CONVERSATION_STATUS', {
        execute: vi.fn().mockImplementation(async () => {
          calledActions.push('CHANGE_CONVERSATION_STATUS');
          return { status: 'COMPLETED', output: { statusChanged: true } };
        }),
      });
      ActionExecutorRegistry.register('SEND_INTERNAL_NOTE', {
        execute: vi.fn().mockImplementation(async () => {
          calledActions.push('SEND_INTERNAL_NOTE');
          return { status: 'COMPLETED', output: { noteCreated: true } };
        }),
      });

      const finalExec = await automationEngine.run(EXEC_ID);

      expect(finalExec.status).toBe('COMPLETED');
      expect(calledActions).toEqual([
        'ADD_TAG',
        'UPDATE_CONTACT',
        'ASSIGN_AGENT',
        'CHANGE_CONVERSATION_STATUS',
        'SEND_INTERNAL_NOTE',
      ]);
    });
  });
});
