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
  publishAutomationEvent: vi.fn().mockResolvedValue(undefined),
  testAutomationRealtimeEvents: [],
  clearTestAutomationRealtimeEvents: vi.fn(),
}));

const mockEnqueueOutboundMessage = vi.fn();
vi.mock('@/lib/queue/outboundQueue', () => ({
  OUTBOUND_QUEUE_NAME: 'whatsapp-outbound',
  enqueueOutboundMessage: (...args: any[]) => mockEnqueueOutboundMessage(...args),
  getOutboundQueue: vi.fn(),
}));

// Imports
import {
  SendWhatsAppMessageExecutor,
  SendWhatsAppTemplateExecutor,
  SendMediaExecutor,
  ActionExecutorRegistry,
  ActionExecutor,
  ActionIdempotencyService,
  VariableResolver,
  NodeExecutorRegistry,
  automationEngine,
  ExecutionContext,
} from '@/lib/services/automation/execution';
import { templateService } from '@/lib/services/whatsapp/templateService';
import { inboxService } from '@/lib/services/inbox/inboxService';
import { AutomationNodeRecord, AutomationEdgeRecord } from '@/lib/services/automation/types';

describe('PHASE 15: Automation WhatsApp Action Engine', () => {
  const workspaceId = 'ws_phase15_001';
  const projectId = 'proj_phase15_001';
  const executionId = 'exec_phase15_001';
  const contactId = 'contact_phase15_001';
  const conversationId = 'conv_phase15_001';

  const mockActiveConnection = {
    id: 'conn_001',
    workspace_id: workspaceId,
    workspaceId,
    project_id: projectId,
    projectId,
    waba_id: 'waba_001',
    wabaId: 'waba_001',
    phone_number_id: 'phone_num_id_123',
    phoneNumberId: 'phone_num_id_123',
    display_phone_number: '+15551234567',
    displayPhoneNumber: '+15551234567',
    status: 'CONNECTED',
    metadata: {},
  };

  const mockContact = {
    id: contactId,
    workspace_id: workspaceId,
    workspaceId,
    project_id: projectId,
    projectId,
    wa_id: '919876543210',
    phone_number: '+919876543210',
    first_name: 'Rahul',
    last_name: 'Sharma',
    display_name: 'Rahul Sharma',
    displayName: 'Rahul Sharma',
    email: 'rahul@example.com',
    company: 'Wazzi Global',
    status: 'ACTIVE',
    lead_score: 85,
    tags: [] as any[],
    phoneNumbers: [
      { id: 'p1', phone_number: '+919876543210', normalized_phone_number: '+919876543210', is_primary: true },
    ],
  };

  const futureWindow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const expiredWindow = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const mockConversationActive = {
    id: conversationId,
    workspace_id: workspaceId,
    workspaceId,
    project_id: projectId,
    projectId,
    contact_id: contactId,
    contactId,
    status: 'open',
    window_expires_at: futureWindow,
    windowExpiresAt: futureWindow,
    phone_number: '+919876543210',
    wa_id: '919876543210',
  };

  const mockConversationExpired = {
    ...mockConversationActive,
    window_expires_at: expiredWindow,
    windowExpiresAt: expiredWindow,
  };

  function defaultDbRouter(query: string) {
    // whatsapp_connections
    if (query.includes('from whatsapp_connections')) {
      return { rows: [mockActiveConnection] };
    }

    // contacts lookup
    if (query.includes('from contacts') && (query.includes('where c.id =') || query.includes('where id =') || query.includes('c.workspace_id ='))) {
      return { rows: [mockContact] };
    }
    if (query.includes('from contact_phone_numbers')) {
      return { rows: mockContact.phoneNumbers };
    }
    if (query.includes('from contact_emails')) {
      return { rows: [] };
    }

    // conversations lookup
    if (query.includes('from conversations') && (query.includes('where c.id =') || query.includes('where id =') || query.includes('workspace_id ='))) {
      return { rows: [mockConversationActive] };
    }

    // action_idempotency
    if (query.includes('from action_idempotency')) {
      return { rows: [] };
    }
    if (query.includes('insert into action_idempotency')) {
      return { rows: [{ id: 'idem_rec_1' }] };
    }

    // messages idempotency
    if (query.includes('from messages') && query.includes('idempotency_key')) {
      return { rows: [] };
    }

    // messages insert
    if (query.includes('insert into messages')) {
      return {
        rows: [
          {
            id: 'msg_phase15_created',
            conversation_id: conversationId,
            body: 'Outbound body',
            type: 'text',
            status: 'queued',
            created_at: new Date().toISOString(),
          },
        ],
      };
    }

    // conversation preview update
    if (query.includes('update conversations')) {
      return { rows: [] };
    }

    // templates lookup
    if (query.includes('from templates') || query.includes('from whatsapp_templates')) {
      return {
        rows: [
          {
            id: 'tpl_approved_001',
            workspace_id: workspaceId,
            name: 'welcome_lead_v1',
            language: 'en_US',
            status: 'APPROVED',
            category: 'UTILITY',
            body_text: 'Hi {{1}}, welcome to {{2}}!',
            meta_template_id: 'meta_tpl_123',
          },
        ],
      };
    }

    return { rows: [] };
  }

  function createNode(def: {
    id: string;
    nodeKey: string;
    type: string;
    label: string;
    configuration?: Record<string, any>;
    automationVersionId?: string;
    positionX?: number;
    positionY?: number;
  }): AutomationNodeRecord {
    return {
      id: def.id,
      automationVersionId: def.automationVersionId || 'ver_001',
      nodeKey: def.nodeKey,
      type: def.type,
      label: def.label,
      positionX: def.positionX ?? 0,
      positionY: def.positionY ?? 0,
      configuration: def.configuration || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function createEdge(def: {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    conditionKey?: any;
    automationVersionId?: string;
  }): AutomationEdgeRecord {
    return {
      id: def.id,
      automationVersionId: def.automationVersionId || 'ver_001',
      sourceNodeId: def.sourceNodeId,
      targetNodeId: def.targetNodeId,
      sourceHandle: def.sourceHandle || null,
      targetHandle: def.targetHandle || null,
      conditionKey: def.conditionKey || null,
      createdAt: new Date().toISOString(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    ActionIdempotencyService.clearCache();
    mockEnqueueOutboundMessage.mockResolvedValue('bullmq_job_123');

    // Default DB Mock router
    mockSql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join(' ').toLowerCase();
      return defaultDbRouter(query);
    });
  });

  function createTestContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
    return {
      executionId,
      workspaceId,
      projectId,
      automationId: 'auto_phase15_001',
      automationVersionId: 'ver_phase15_001',
      triggerType: 'WHATSAPP_INCOMING_MESSAGE',
      triggerEventId: 'evt_001',
      contactId,
      conversationId,
      variables: {
        contact: {
          first_name: 'Rahul',
          last_name: 'Sharma',
          name: 'Rahul Sharma',
          company: 'Wazzi Global',
        },
        project: {
          name: 'Wazzi Academy',
        },
        message: {
          text: 'Need pricing details',
        },
      },
      currentNodeId: 'node_action_1',
      visitedNodeIds: [],
      stepCount: 1,
      startedAt: Date.now(),
      metadata: {},
      ...overrides,
    };
  }

  // ============================================================================
  // 1. SEND_WHATSAPP_MESSAGE EXECUTOR TESTS
  // ============================================================================
  describe('SEND_WHATSAPP_MESSAGE Executor', () => {
    it('successfully queues a WhatsApp text message within 24h window with variable resolution', async () => {
      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_msg_1',
        nodeKey: 'send_whatsapp_1',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: {
          messageText: 'Hello {{contact.first_name}}, welcome to {{project.name}}! We got your query: "{{message.text}}".',
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('COMPLETED');
      expect(result.output?.status).toBe('QUEUED');
      expect(result.output?.action).toBe('SEND_WHATSAPP_MESSAGE');
      expect(result.output?.messageId).toBe('msg_phase15_created');
      expect(result.output?.recipient).toBe('+919876543210');
      expect(result.output?.source).toBe('AUTOMATION');
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledTimes(1);
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'msg_phase15_created',
          workspaceId,
          projectId,
          conversationId,
          body: 'Hello Rahul, welcome to Wazzi Academy! We got your query: "Need pricing details".',
          type: 'text',
        })
      );
    });

    it('rejects free-form message when 24h customer messaging window is expired', async () => {
      // Mock conversation with expired window
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from conversations')) {
          return { rows: [mockConversationExpired] };
        }
        if (query.includes('from contacts')) {
          return { rows: [mockContact] };
        }
        if (query.includes('from whatsapp_connections')) {
          return { rows: [mockActiveConnection] };
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_msg_2',
        nodeKey: 'send_whatsapp_expired',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: {
          messageText: 'This should fail due to window expiry.',
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('MESSAGE_WINDOW_RESTRICTED');
      expect(result.errorMessage).toContain('Customer service window expired');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects message when contact has no verified phone number', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from contacts')) {
          return { rows: [{ ...mockContact, phone_number: null as any, wa_id: null as any }] };
        }
        if (query.includes('from contact_phone_numbers')) {
          return { rows: [] };
        }
        if (query.includes('from whatsapp_connections')) {
          return { rows: [mockActiveConnection] };
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_msg_no_phone',
        nodeKey: 'msg_no_phone',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: { messageText: 'Hello' },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('RECIPIENT_PHONE_NOT_FOUND');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects message when project has no active WhatsApp connection', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from contacts')) {
          return { rows: [mockContact] };
        }
        if (query.includes('from whatsapp_connections')) {
          return { rows: [] }; // No connection
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_msg_no_conn',
        nodeKey: 'msg_no_conn',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: { messageText: 'Hello' },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('WHATSAPP_CONNECTION_UNAVAILABLE');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects message when configured whatsappPhoneNumberId belongs to a different project', async () => {
      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_msg_unauthorized_phone',
        nodeKey: 'msg_unauthorized_phone',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: {
          messageText: 'Hello',
          whatsappPhoneNumberId: 'phone_belonging_to_another_project',
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('UNAUTHORIZED_RESOURCE');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('supports DRY_RUN execution mode without creating message or queueing BullMQ job', async () => {
      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_msg_dryrun',
        nodeKey: 'msg_dryrun',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: { messageText: 'Dry run message for {{contact.first_name}}' },
      });

      const context = createTestContext({
        metadata: { dryRun: true },
      });

      const result = await executor.execute(node, context);

      expect(result.status).toBe('COMPLETED');
      expect(result.output?.status).toBe('DRY_RUN');
      expect(result.output?.wouldSend).toBe(true);
      expect(result.output?.messageText).toBe('Dry run message for Rahul');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('idempotency: ActionExecutor skips duplicate message creation on worker retry', async () => {
      const actionExecutor = new ActionExecutor();
      const node = createNode({
        id: 'node_msg_idem',
        nodeKey: 'msg_idem',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: { messageText: 'First try message' },
      });

      const context = createTestContext();

      // First run: executes normally
      const firstRun = await actionExecutor.execute(node, context);
      expect(firstRun.status).toBe('COMPLETED');
      expect(firstRun.output?.status).toBe('QUEUED');
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledTimes(1);

      // Second run (simulate worker retry with identical executionId & nodeId)
      const secondRun = await actionExecutor.execute(node, context);
      expect(secondRun.status).toBe('COMPLETED');
      expect(secondRun.output?.deduplicated).toBe(true);
      // Queue was not called a second time
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 2. SEND_WHATSAPP_TEMPLATE EXECUTOR TESTS
  // ============================================================================
  describe('SEND_WHATSAPP_TEMPLATE Executor', () => {
    it('successfully queues approved template outside 24h customer window', async () => {
      // Mock conversation with expired window (Template MUST bypass 24h window)
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from conversations')) {
          return { rows: [mockConversationExpired] };
        }
        if (query.includes('from contacts')) {
          return { rows: [mockContact] };
        }
        if (query.includes('from whatsapp_connections')) {
          return { rows: [mockActiveConnection] };
        }
        if (query.includes('from templates') || query.includes('from whatsapp_templates')) {
          return {
            rows: [
              {
                id: 'tpl_001',
                workspace_id: workspaceId,
                name: 'welcome_lead_v1',
                language: 'en_US',
                status: 'APPROVED',
                category: 'UTILITY',
                body_text: 'Hi {{1}}, welcome to {{2}}!',
              },
            ],
          };
        }
        if (query.includes('insert into messages')) {
          return {
            rows: [
              {
                id: 'msg_template_created',
                conversation_id: conversationId,
                body: 'Hi Rahul, welcome to Wazzi Academy!',
                type: 'template',
                status: 'queued',
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppTemplateExecutor();
      const node = createNode({
        id: 'node_tpl_1',
        nodeKey: 'send_tpl_1',
        type: 'SEND_WHATSAPP_TEMPLATE',
        label: 'Send WhatsApp Template',
        configuration: {
          templateName: 'welcome_lead_v1',
          languageCode: 'en_US',
          parameters: ['{{contact.first_name}}', '{{project.name}}'],
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('COMPLETED');
      expect(result.output?.status).toBe('QUEUED');
      expect(result.output?.action).toBe('SEND_WHATSAPP_TEMPLATE');
      expect(result.output?.templateName).toBe('welcome_lead_v1');
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'template',
          templateName: 'welcome_lead_v1',
          templateParams: ['Rahul', 'Wazzi Academy'],
        })
      );
    });

    it('rejects template when template is not approved (e.g. PENDING or REJECTED)', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from contacts')) return { rows: [mockContact] };
        if (query.includes('from whatsapp_connections')) return { rows: [mockActiveConnection] };
        if (query.includes('from templates') || query.includes('from whatsapp_templates')) {
          return {
            rows: [
              {
                id: 'tpl_pending',
                workspace_id: workspaceId,
                name: 'pending_template',
                language: 'en_US',
                status: 'PENDING',
                category: 'MARKETING',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppTemplateExecutor();
      const node = createNode({
        id: 'node_tpl_pending',
        nodeKey: 'send_tpl_pending',
        type: 'SEND_WHATSAPP_TEMPLATE',
        label: 'Send WhatsApp Template',
        configuration: {
          templateName: 'pending_template',
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('TEMPLATE_NOT_APPROVED');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects template when template does not exist', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from contacts')) return { rows: [mockContact] };
        if (query.includes('from whatsapp_connections')) return { rows: [mockActiveConnection] };
        if (query.includes('from templates') || query.includes('from whatsapp_templates')) {
          return { rows: [] }; // No template
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppTemplateExecutor();
      const node = createNode({
        id: 'node_tpl_missing',
        nodeKey: 'send_tpl_missing',
        type: 'SEND_WHATSAPP_TEMPLATE',
        label: 'Send WhatsApp Template',
        configuration: {
          templateName: 'non_existent_template',
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('TEMPLATE_NOT_FOUND');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects template when requested language is not supported', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from contacts')) return { rows: [mockContact] };
        if (query.includes('from whatsapp_connections')) return { rows: [mockActiveConnection] };
        if (query.includes('from templates') || query.includes('from whatsapp_templates')) {
          return {
            rows: [
              {
                id: 'tpl_en',
                workspace_id: workspaceId,
                name: 'welcome_lead_v1',
                language: 'en_US',
                status: 'APPROVED',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const executor = new SendWhatsAppTemplateExecutor();
      const node = createNode({
        id: 'node_tpl_lang',
        nodeKey: 'send_tpl_lang',
        type: 'SEND_WHATSAPP_TEMPLATE',
        label: 'Send WhatsApp Template',
        configuration: {
          templateName: 'welcome_lead_v1',
          languageCode: 'es_ES', // Mismatched language
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INVALID_TEMPLATE_LANGUAGE');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('template idempotency prevents duplicate queuing on retry', async () => {
      const actionExecutor = new ActionExecutor();
      const node = createNode({
        id: 'node_tpl_retry',
        nodeKey: 'send_tpl_retry',
        type: 'SEND_WHATSAPP_TEMPLATE',
        label: 'Send WhatsApp Template',
        configuration: {
          templateName: 'welcome_lead_v1',
        },
      });

      const context = createTestContext();
      const run1 = await actionExecutor.execute(node, context);
      expect(run1.status).toBe('COMPLETED');
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledTimes(1);

      const run2 = await actionExecutor.execute(node, context);
      expect(run2.status).toBe('COMPLETED');
      expect(run2.output?.deduplicated).toBe(true);
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 3. SEND_MEDIA EXECUTOR TESTS
  // ============================================================================
  describe('SEND_MEDIA Executor', () => {
    it('successfully queues image media within 24h window with caption variable resolution', async () => {
      const executor = new SendMediaExecutor();
      const node = createNode({
        id: 'node_media_1',
        nodeKey: 'send_media_1',
        type: 'SEND_MEDIA',
        label: 'Send Media',
        configuration: {
          mediaType: 'image',
          mediaUrl: 'https://storage.wazzi.app/images/brochure.png',
          caption: 'Hi {{contact.first_name}}, here is the {{project.name}} brochure.',
        },
      });

      const context = createTestContext();
      const result = await executor.execute(node, context);

      expect(result.status).toBe('COMPLETED');
      expect(result.output?.status).toBe('QUEUED');
      expect(result.output?.action).toBe('SEND_MEDIA');
      expect(result.output?.mediaType).toBe('image');
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          mediaUrl: 'https://storage.wazzi.app/images/brochure.png',
          caption: 'Hi Rahul, here is the Wazzi Academy brochure.',
        })
      );
    });

    it('successfully queues document, video, and audio media types', async () => {
      const executor = new SendMediaExecutor();
      const types = ['document', 'video', 'audio'];

      for (const mediaType of types) {
        const node = createNode({
          id: `node_media_${mediaType}`,
          nodeKey: `media_${mediaType}`,
          type: 'SEND_MEDIA',
          label: 'Send Media',
          configuration: {
            mediaType,
            mediaUrl: `https://storage.wazzi.app/files/sample.${mediaType === 'document' ? 'pdf' : 'mp4'}`,
          },
        });

        const result = await executor.execute(node, createTestContext({ executionId: `exec_${mediaType}` }));
        expect(result.status).toBe('COMPLETED');
        expect(result.output?.mediaType).toBe(mediaType);
      }
    });

    it('rejects unsupported media type', async () => {
      const executor = new SendMediaExecutor();
      const node = createNode({
        id: 'node_media_unsupported',
        nodeKey: 'media_unsupported',
        type: 'SEND_MEDIA',
        label: 'Send Media',
        configuration: {
          mediaType: 'exe_binary',
          mediaUrl: 'https://storage.wazzi.app/malicious.exe',
        },
      });

      const result = await executor.execute(node, createTestContext());
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('MEDIA_INVALID');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects filename containing path traversal characters', async () => {
      const executor = new SendMediaExecutor();
      const node = createNode({
        id: 'node_media_traversal',
        nodeKey: 'media_traversal',
        type: 'SEND_MEDIA',
        label: 'Send Media',
        configuration: {
          mediaType: 'document',
          mediaUrl: 'https://storage.wazzi.app/doc.pdf',
          filename: '../../etc/passwd',
        },
      });

      const result = await executor.execute(node, createTestContext());
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('MEDIA_INVALID');
      expect(result.errorMessage).toContain('traversal');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });

    it('rejects free-form media when 24h customer window is expired', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from conversations')) return { rows: [mockConversationExpired] };
        if (query.includes('from contacts')) return { rows: [mockContact] };
        if (query.includes('from whatsapp_connections')) return { rows: [mockActiveConnection] };
        return { rows: [] };
      });

      const executor = new SendMediaExecutor();
      const node = createNode({
        id: 'node_media_expired',
        nodeKey: 'media_expired',
        type: 'SEND_MEDIA',
        label: 'Send Media',
        configuration: {
          mediaType: 'image',
          mediaUrl: 'https://storage.wazzi.app/img.jpg',
        },
      });

      const result = await executor.execute(node, createTestContext());
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('MESSAGE_WINDOW_RESTRICTED');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 4. INTEGRATION & PIPELINE NON-LEAKAGE TESTS
  // ============================================================================
  describe('Full Multi-Node Pipeline & Non-Leakage Tests', () => {
    it('executes sequential pipeline and ensures SEND_INTERNAL_NOTE never enters WhatsApp outbound queue', async () => {
      const versionId = 'ver_full_flow_001';

      const nodes: AutomationNodeRecord[] = [
        createNode({
          id: 'n_trig',
          automationVersionId: versionId,
          nodeKey: 'trigger',
          type: 'WHATSAPP_INCOMING_MESSAGE',
          label: 'Incoming Message',
        }),
        createNode({
          id: 'n_cond',
          automationVersionId: versionId,
          nodeKey: 'condition',
          type: 'MESSAGE_CONTAINS',
          label: 'Contains Course',
          configuration: { text: 'pricing' },
        }),
        createNode({
          id: 'n_wa_msg',
          automationVersionId: versionId,
          nodeKey: 'send_reply',
          type: 'SEND_WHATSAPP_MESSAGE',
          label: 'Send WhatsApp Message',
          configuration: {
            messageText: 'Hi {{contact.first_name}}, our courses start at ₹2,999.',
          },
        }),
        createNode({
          id: 'n_note',
          automationVersionId: versionId,
          nodeKey: 'internal_note',
          type: 'SEND_INTERNAL_NOTE',
          label: 'Send Internal Note',
          configuration: {
            text: 'Automated pricing sent to {{contact.first_name}}.',
          },
        }),
        createNode({
          id: 'n_term',
          automationVersionId: versionId,
          nodeKey: 'terminal',
          type: 'TERMINAL',
          label: 'End',
        }),
      ];

      const edges: AutomationEdgeRecord[] = [
        createEdge({ id: 'e1', automationVersionId: versionId, sourceNodeId: 'n_trig', targetNodeId: 'n_cond' }),
        createEdge({ id: 'e2', automationVersionId: versionId, sourceNodeId: 'n_cond', targetNodeId: 'n_wa_msg', sourceHandle: 'YES' }),
        createEdge({ id: 'e3', automationVersionId: versionId, sourceNodeId: 'n_wa_msg', targetNodeId: 'n_note' }),
        createEdge({ id: 'e4', automationVersionId: versionId, sourceNodeId: 'n_note', targetNodeId: 'n_term' }),
      ];

      // Custom DB router for full execution
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();

        if (query.includes('from automation_executions')) {
          return {
            rows: [
              {
                id: 'exec_full_001',
                workspace_id: workspaceId,
                project_id: projectId,
                automation_id: 'auto_full',
                automation_version_id: versionId,
                contact_id: contactId,
                conversation_id: conversationId,
                status: 'QUEUED',
                trigger_event_id: 'evt_full',
                trigger_context: {
                  contactId,
                  conversationId,
                  contact: {
                    id: contactId,
                    first_name: 'Rahul',
                    last_name: 'Sharma',
                  },
                  project: {
                    name: 'Wazzi Academy',
                  },
                  message: { text: 'pricing info please', body: 'pricing info please' },
                },
              },
            ],
          };
        }
        if (query.includes('from automations')) {
          return {
            rows: [
              { id: 'auto_full', workspace_id: workspaceId, project_id: projectId, status: 'ACTIVE', current_version_id: versionId },
            ],
          };
        }
        if (query.includes('from automation_versions')) {
          return {
            rows: [
              { id: versionId, automation_id: 'auto_full', status: 'PUBLISHED', version_number: 1 },
            ],
          };
        }
        if (query.includes('from automation_nodes')) return { rows: nodes };
        if (query.includes('from automation_edges')) return { rows: edges };
        if (query.includes('update automation_executions')) {
          if (query.includes("status = 'running'")) {
            return { rows: [{ id: 'exec_full_001', status: 'RUNNING' }] };
          }
          return { rows: [{ id: 'exec_full_001', status: 'COMPLETED' }] };
        }
        if (query.includes('insert into automation_execution_steps') || query.includes('update automation_execution_steps')) {
          return { rows: [{ id: 'step_mock' }] };
        }
        if (query.includes('from conversations')) return { rows: [mockConversationActive] };
        if (query.includes('from contacts')) return { rows: [mockContact] };
        if (query.includes('from contact_phone_numbers')) return { rows: mockContact.phoneNumbers };
        if (query.includes('from whatsapp_connections')) return { rows: [mockActiveConnection] };
        if (query.includes('from internal_notes')) return { rows: [] };
        if (query.includes('insert into internal_notes')) return { rows: [{ id: 'note_123' }] };
        if (query.includes('insert into messages')) {
          return {
            rows: [
              {
                id: 'msg_pipe_1',
                conversation_id: conversationId,
                body: 'Hi Rahul, our courses start at ₹2,999.',
                type: 'text',
                status: 'queued',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const execResult = await automationEngine.run('exec_full_001');

      expect(execResult.status).toBe('COMPLETED');
      // Verify exactly ONE WhatsApp outbound message was queued (the message, NOT the internal note!)
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledTimes(1);
      expect(mockEnqueueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Hi Rahul, our courses start at ₹2,999.',
          type: 'text',
        })
      );
    });

    it('cross-tenant isolation: blocks automation in Project A from sending to Contact in Project B', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const query = strings.join(' ').toLowerCase();
        if (query.includes('from contacts') && query.includes('project_id =')) {
          return { rows: [] }; // Cross-project contact access denied
        }
        if (query.includes('from whatsapp_connections')) return { rows: [mockActiveConnection] };
        return { rows: [] };
      });

      const executor = new SendWhatsAppMessageExecutor();
      const node = createNode({
        id: 'node_cross_tenant',
        nodeKey: 'msg_cross',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send WhatsApp Message',
        configuration: { messageText: 'Hello' },
      });

      const context = createTestContext({
        projectId: 'project_A',
      });

      const result = await executor.execute(node, context);
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('RECIPIENT_NOT_FOUND');
      expect(mockEnqueueOutboundMessage).not.toHaveBeenCalled();
    });
  });
});
