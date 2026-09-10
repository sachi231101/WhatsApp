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

vi.mock('@/lib/auth/context', () => ({
  ensureCoreTables: vi.fn().mockResolvedValue(undefined),
}));

// Imports
import { domainEventDispatcher, publishDomainEvent, DomainEvent } from '@/lib/events/domainEvent';
import { TriggerValidator } from '@/lib/services/automation/triggerValidator';
import { TriggerMatcher } from '@/lib/services/automation/triggerMatcher';
import { createTriggerContext, sanitizePayload } from '@/lib/services/automation/triggerContext';
import { automationTriggerService, AutomationTriggerService } from '@/lib/services/automation/automationTriggerService';
import { automationScheduleService } from '@/lib/services/automation/automationScheduleService';
import {
  testEnqueuedAutomationJobs,
  clearTestAutomationJobs,
} from '@/lib/queue/automationExecutionQueue';
import {
  testRegisteredSchedules,
  clearTestSchedules,
} from '@/lib/queue/automationScheduleQueue';
import { triggerObservability } from '@/lib/services/automation/triggerObservability';
import { AutomationNodeRecord } from '@/lib/services/automation/types';

describe('PHASE 10: Automation Trigger Engine', () => {
  const WS_ID = '11111111-1111-1111-1111-111111111111';
  const PROJ_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_PROJ_ID = '99999999-9999-9999-9999-999999999999';
  const AUTO_ID = '33333333-3333-3333-3333-333333333333';
  const VER_ID = '44444444-4444-4444-4444-444444444444';
  const NODE_ID = '55555555-5555-5555-5555-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
    domainEventDispatcher.clear();
    clearTestAutomationJobs();
    clearTestSchedules();
    triggerObservability.resetMetrics();
  });

  // ==========================================================================
  // 1. DOMAIN EVENT ABSTRACTION & DISPATCHER
  // ==========================================================================
  describe('Domain Event Abstraction & Dispatcher', () => {
    it('should dispatch events to subscribed type handlers', async () => {
      const handler = vi.fn();
      domainEventDispatcher.subscribe('message.created', handler);

      const event: DomainEvent = {
        id: 'evt-101',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { body: 'Hello world' },
      };

      await publishDomainEvent(event);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should dispatch to global handlers via subscribeAll', async () => {
      const globalHandler = vi.fn();
      domainEventDispatcher.subscribeAll(globalHandler);

      const event: DomainEvent = {
        id: 'evt-102',
        type: 'contact.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { contactId: 'cnt-1' },
      };

      await publishDomainEvent(event);
      expect(globalHandler).toHaveBeenCalledTimes(1);
    });

    it('should safely catch errors in event handlers without throwing', async () => {
      domainEventDispatcher.subscribe('test.error', () => {
        throw new Error('Handler crash');
      });

      const event: DomainEvent = {
        id: 'evt-error',
        type: 'test.error',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: {},
      };

      await expect(publishDomainEvent(event)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // 2. TRIGGER VALIDATOR
  // ==========================================================================
  describe('TriggerValidator', () => {
    it('validates NEW_WHATSAPP_MESSAGE configuration', () => {
      expect(TriggerValidator.validate('NEW_WHATSAPP_MESSAGE', { whatsappNumber: 'ALL', messageType: 'ALL' }).valid).toBe(true);
      expect(TriggerValidator.validate('NEW_WHATSAPP_MESSAGE', { whatsappNumber: 12345 as any }).valid).toBe(false);
      expect(TriggerValidator.validate('NEW_WHATSAPP_MESSAGE', { onlyNewContacts: 'yes' as any }).valid).toBe(false);
    });

    it('validates KEYWORD_MATCH configuration', () => {
      expect(TriggerValidator.validate('KEYWORD_MATCH', { keywords: ['pricing', 'course'], matchMode: 'ANY' }).valid).toBe(true);
      expect(TriggerValidator.validate('KEYWORD_MATCH', { keywords: [] }).valid).toBe(false);
      expect(TriggerValidator.validate('KEYWORD_MATCH', { keywords: ['hello'], matchMode: 'INVALID_MODE' }).valid).toBe(false);
      expect(TriggerValidator.validate('KEYWORD_MATCH', { keywords: 'help, support', matchMode: 'CONTAINS' }).valid).toBe(true);
    });

    it('validates CONVERSATION_CREATED, CUSTOMER_REPLIED, and CONTACT_CREATED', () => {
      expect(TriggerValidator.validate('CONVERSATION_CREATED', { channel: 'WHATSAPP' }).valid).toBe(true);
      expect(TriggerValidator.validate('CUSTOMER_REPLIED', { withinHours: 24 }).valid).toBe(true);
      expect(TriggerValidator.validate('CUSTOMER_REPLIED', { withinHours: -5 }).valid).toBe(false);
      expect(TriggerValidator.validate('CONTACT_CREATED', { source: 'WHATSAPP' }).valid).toBe(true);
    });

    it('validates SCHEDULED_TRIGGER configuration', () => {
      expect(TriggerValidator.validate('SCHEDULED_TRIGGER', { cron: '0 9 * * 1-5', timezone: 'UTC' }).valid).toBe(true);
      expect(TriggerValidator.validate('SCHEDULED_TRIGGER', { cron: 'invalid-cron' }).valid).toBe(false);
    });
  });

  // ==========================================================================
  // 3. TRIGGER MATCHER
  // ==========================================================================
  describe('TriggerMatcher', () => {
    const makeNode = (type: string, config: any): AutomationNodeRecord => ({
      id: NODE_ID,
      automationVersionId: VER_ID,
      nodeKey: 'trigger_1',
      type,
      label: 'Trigger',
      positionX: 0,
      positionY: 0,
      configuration: config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    describe('NEW_WHATSAPP_MESSAGE', () => {
      it('matches all numbers and types when set to ALL', () => {
        const node = makeNode('NEW_WHATSAPP_MESSAGE', { whatsappNumber: 'ALL', messageType: 'ALL' });
        const ctx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', messageType: 'text', phoneNumberId: '123' },
        });

        const res = TriggerMatcher.matches(node, ctx);
        expect(res.matched).toBe(true);
      });

      it('filters by specific phone number ID', () => {
        const node = makeNode('NEW_WHATSAPP_MESSAGE', { whatsappNumber: 'target-phone-id', messageType: 'ALL' });
        const ctxMatch = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', phoneNumberId: 'target-phone-id' },
        });
        const ctxNoMatch = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', phoneNumberId: 'different-phone' },
        });

        expect(TriggerMatcher.matches(node, ctxMatch).matched).toBe(true);
        expect(TriggerMatcher.matches(node, ctxNoMatch).matched).toBe(false);
      });

      it('filters by message type (text vs media)', () => {
        const textNode = makeNode('NEW_WHATSAPP_MESSAGE', { whatsappNumber: 'ALL', messageType: 'text' });
        const mediaNode = makeNode('NEW_WHATSAPP_MESSAGE', { whatsappNumber: 'ALL', messageType: 'media' });

        const textCtx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', type: 'text' },
        });
        const imageCtx = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', type: 'image' },
        });

        expect(TriggerMatcher.matches(textNode, textCtx).matched).toBe(true);
        expect(TriggerMatcher.matches(textNode, imageCtx).matched).toBe(false);
        expect(TriggerMatcher.matches(mediaNode, imageCtx).matched).toBe(true);
      });

      it('enforces onlyNewContacts filter', () => {
        const node = makeNode('NEW_WHATSAPP_MESSAGE', { onlyNewContacts: true });

        const newContactCtx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', isNewContact: true },
        });
        const existingContactCtx = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', isNewContact: false },
        });

        expect(TriggerMatcher.matches(node, newContactCtx).matched).toBe(true);
        expect(TriggerMatcher.matches(node, existingContactCtx).matched).toBe(false);
      });
    });

    describe('KEYWORD_MATCH', () => {
      it('matches contains / ANY mode case-insensitively by default', () => {
        const node = makeNode('KEYWORD_MATCH', {
          keywords: ['course', 'pricing', 'admission'],
          matchMode: 'ANY',
          caseSensitive: false,
        });

        const ctx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'Can you send me your Course pricing details?' },
        });

        expect(TriggerMatcher.matches(node, ctx).matched).toBe(true);
      });

      it('rejects message if keyword is not found', () => {
        const node = makeNode('KEYWORD_MATCH', {
          keywords: ['pricing', 'fee'],
          matchMode: 'ANY',
        });

        const ctx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'Just saying hello!' },
        });

        expect(TriggerMatcher.matches(node, ctx).matched).toBe(false);
      });

      it('enforces case sensitivity when caseSensitive = true', () => {
        const node = makeNode('KEYWORD_MATCH', {
          keywords: ['START'],
          matchMode: 'EXACT',
          caseSensitive: true,
        });

        const ctxUpper = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'START' },
        });
        const ctxLower = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'start' },
        });

        expect(TriggerMatcher.matches(node, ctxUpper).matched).toBe(true);
        expect(TriggerMatcher.matches(node, ctxLower).matched).toBe(false);
      });

      it('enforces whole word matching when wholeWord = true', () => {
        const node = makeNode('KEYWORD_MATCH', {
          keywords: ['price'],
          matchMode: 'CONTAINS',
          wholeWord: true,
        });

        const subWordCtx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'What is the enterprise pricing tier?' }, // contains 'pricing', but not word 'price'
        });
        const wholeWordCtx = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'What is the price of this item?' },
        });

        expect(TriggerMatcher.matches(node, subWordCtx).matched).toBe(false);
        expect(TriggerMatcher.matches(node, wholeWordCtx).matched).toBe(true);
      });

      it('requires all keywords when matchMode = ALL', () => {
        const node = makeNode('KEYWORD_MATCH', {
          keywords: ['demo', 'booking'],
          matchMode: 'ALL',
        });

        const partialCtx = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'I want a demo' },
        });
        const allCtx = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', body: 'I want demo booking information' },
        });

        expect(TriggerMatcher.matches(node, partialCtx).matched).toBe(false);
        expect(TriggerMatcher.matches(node, allCtx).matched).toBe(true);
      });
    });

    describe('CONVERSATION_CREATED', () => {
      it('matches new conversation with channel filter', () => {
        const node = makeNode('CONVERSATION_CREATED', { channel: 'WHATSAPP' });
        const ctx = createTriggerContext({
          id: 'e1',
          type: 'conversation.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { channel: 'WHATSAPP', conversationId: 'c1' },
        });

        expect(TriggerMatcher.matches(node, ctx).matched).toBe(true);
      });
    });

    describe('CUSTOMER_REPLIED', () => {
      it('matches inbound customer messages and ignores outbound business messages', () => {
        const node = makeNode('CUSTOMER_REPLIED', {});

        const inboundCustomer = createTriggerContext({
          id: 'e1',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', senderType: 'customer', body: 'Yes, I am interested' },
        });
        const outboundBusiness = createTriggerContext({
          id: 'e2',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'outbound', senderType: 'user', body: 'Our offer is ready' },
        });
        const automationEvent = createTriggerContext({
          id: 'e3',
          type: 'message.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { direction: 'inbound', senderType: 'customer' },
          metadata: { source: 'automation' },
        });

        expect(TriggerMatcher.matches(node, inboundCustomer).matched).toBe(true);
        expect(TriggerMatcher.matches(node, outboundBusiness).matched).toBe(false);
        expect(TriggerMatcher.matches(node, automationEvent).matched).toBe(false);
      });
    });

    describe('CONTACT_CREATED', () => {
      it('matches contact.created event with source filter', () => {
        const node = makeNode('CONTACT_CREATED', { source: 'WHATSAPP' });
        const matchCtx = createTriggerContext({
          id: 'e1',
          type: 'contact.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { contactId: 'cnt-1', source: 'WHATSAPP' },
        });
        const noMatchCtx = createTriggerContext({
          id: 'e2',
          type: 'contact.created',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { contactId: 'cnt-2', source: 'MANUAL' },
        });

        expect(TriggerMatcher.matches(node, matchCtx).matched).toBe(true);
        expect(TriggerMatcher.matches(node, noMatchCtx).matched).toBe(false);
      });
    });

    describe('TAG_ADDED', () => {
      it('matches specific tag name or tagId', () => {
        const node = makeNode('TAG_ADDED', { tagName: 'VIP' });

        const matchCtx = createTriggerContext({
          id: 'e1',
          type: 'contact.tag_added',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { contactId: 'c1', tagName: 'VIP', tagId: 't1' },
        });
        const diffCtx = createTriggerContext({
          id: 'e2',
          type: 'contact.tag_added',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { contactId: 'c1', tagName: 'Lead', tagId: 't2' },
        });

        expect(TriggerMatcher.matches(node, matchCtx).matched).toBe(true);
        expect(TriggerMatcher.matches(node, diffCtx).matched).toBe(false);
      });
    });

    describe('SCHEDULED_TRIGGER', () => {
      it('matches scheduled.trigger event', () => {
        const node = makeNode('SCHEDULED_TRIGGER', { cron: '0 9 * * 1-5' });
        const ctx = createTriggerContext({
          id: 'sched-1',
          type: 'scheduled.trigger',
          workspaceId: WS_ID,
          projectId: PROJ_ID,
          occurredAt: new Date().toISOString(),
          payload: { automationId: AUTO_ID },
        });

        expect(TriggerMatcher.matches(node, ctx).matched).toBe(true);
      });
    });
  });

  // ==========================================================================
  // 4. SECURITY & PAYLOAD SANITIZATION
  // ==========================================================================
  describe('Payload Security & Sanitization', () => {
    it('strips API keys, secrets, tokens, and credentials from trigger context', () => {
      const dirtyPayload = {
        messageId: 'm1',
        access_token: 'EAABwz...',
        meta_secret: 'supersecret',
        apiKey: 'sk-12345',
        user: {
          password_hash: 'abc',
          name: 'John',
        },
      };

      const sanitized = sanitizePayload(dirtyPayload);
      expect(sanitized.messageId).toBe('m1');
      expect(sanitized.access_token).toBe('[REDACTED]');
      expect(sanitized.meta_secret).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.password_hash).toBe('[REDACTED]');
      expect(sanitized.user.name).toBe('John');
    });
  });

  // ==========================================================================
  // 5. AUTOMATION TRIGGER SERVICE (FULL ORCHESTRATION)
  // ==========================================================================
  describe('AutomationTriggerService (Full Orchestration)', () => {
    it('rejects events when project does not belong to workspace (tenant isolation)', async () => {
      // Mock: project does not belong to workspace
      mockSql.mockResolvedValueOnce({ rows: [] });

      const event: DomainEvent = {
        id: 'cross-tenant-evt',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: 'foreign-project',
        occurredAt: new Date().toISOString(),
        payload: { body: 'Hello' },
      };

      const result = await automationTriggerService.handle(event);
      expect(result.success).toBe(false);
      expect(result.createdExecutions.length).toBe(0);
    });

    it('ignores DRAFT, PAUSED, and ARCHIVED automations', async () => {
      // 1. Project check succeeds
      mockSql.mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] });
      // 2. Active automations query returns empty (since status != ACTIVE or current_version_id is null)
      mockSql.mockResolvedValueOnce({ rows: [] });

      const event: DomainEvent = {
        id: 'evt-draft-test',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { direction: 'inbound', body: 'test message' },
      };

      const result = await automationTriggerService.handle(event);
      expect(result.success).toBe(true);
      expect(result.matchedCount).toBe(0);
      expect(result.createdExecutions.length).toBe(0);
    });

    it('ignores active automations whose current version is DRAFT or ARCHIVED', async () => {
      // 1. Project check
      mockSql.mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] });
      // 2. Active automation found
      mockSql.mockResolvedValueOnce({
        rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Workflow', status: 'ACTIVE', current_version_id: VER_ID }],
      });
      // 3. Version query returns empty because status is DRAFT (not PUBLISHED)
      mockSql.mockResolvedValueOnce({ rows: [] });

      const event: DomainEvent = {
        id: 'evt-ver-test',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { direction: 'inbound', body: 'Hello' },
      };

      const result = await automationTriggerService.handle(event);
      expect(result.matchedCount).toBe(0);
      expect(result.createdExecutions.length).toBe(0);
    });

    it('creates execution in QUEUED status and enqueues BullMQ job on matching active automation', async () => {
      // 1. Project check
      mockSql.mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] });
      // 2. Active automation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Lead Welcomer', status: 'ACTIVE', current_version_id: VER_ID }],
      });
      // 3. Version check (PUBLISHED)
      mockSql.mockResolvedValueOnce({
        rows: [{ id: VER_ID, status: 'PUBLISHED', version_number: 1 }],
      });
      // 4. Nodes query
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: NODE_ID,
            automation_version_id: VER_ID,
            node_key: 'node_trigger',
            type: 'NEW_WHATSAPP_MESSAGE',
            label: 'New WhatsApp Message',
            configuration: { whatsappNumber: 'ALL', messageType: 'ALL' },
          },
        ],
      });
      // 5. getAutomation check inside createExecution
      mockSql.mockResolvedValueOnce({
        rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Lead Welcomer', status: 'ACTIVE' }],
      });
      // 6. Idempotency query (returns empty)
      mockSql.mockResolvedValueOnce({ rows: [] });
      // 7. Insert execution query
      const execId = 'exec-auto-123';
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: execId,
            workspace_id: WS_ID,
            project_id: PROJ_ID,
            automation_id: AUTO_ID,
            automation_version_id: VER_ID,
            trigger_type: 'NEW_WHATSAPP_MESSAGE',
            trigger_event_id: 'evt-1',
            idempotency_key: `${AUTO_ID}:${VER_ID}:evt-1`,
            status: 'QUEUED',
            current_node_id: NODE_ID,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const event: DomainEvent = {
        id: 'evt-1',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: {
          messageId: 'msg-1',
          direction: 'inbound',
          senderType: 'customer',
          body: 'Hello, I want to inquire',
        },
      };

      const result = await automationTriggerService.handle(event);

      expect(result.success).toBe(true);
      expect(result.matchedCount).toBe(1);
      expect(result.createdExecutions.length).toBe(1);
      expect(result.createdExecutions[0].status).toBe('QUEUED');
      expect(result.createdExecutions[0].currentNodeId).toBe(NODE_ID);

      // Verify BullMQ job dispatch
      expect(testEnqueuedAutomationJobs.length).toBe(1);
      expect(testEnqueuedAutomationJobs[0].data.executionId).toBe(execId);
      expect(testEnqueuedAutomationJobs[0].data.automationId).toBe(AUTO_ID);
    });

    it('enforces idempotency: duplicate event does not create duplicate execution or job', async () => {
      // 1. Project check
      mockSql.mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] });
      // 2. Active automation
      mockSql.mockResolvedValueOnce({
        rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Lead Welcomer', status: 'ACTIVE', current_version_id: VER_ID }],
      });
      // 3. Version check
      mockSql.mockResolvedValueOnce({
        rows: [{ id: VER_ID, status: 'PUBLISHED', version_number: 1 }],
      });
      // 4. Nodes query
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: NODE_ID,
            automation_version_id: VER_ID,
            node_key: 'node_trigger',
            type: 'NEW_WHATSAPP_MESSAGE',
            label: 'New Message',
            configuration: { whatsappNumber: 'ALL', messageType: 'ALL' },
          },
        ],
      });
      // 5. getAutomation check inside createExecution
      mockSql.mockResolvedValueOnce({
        rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Lead Welcomer', status: 'ACTIVE' }],
      });
      // 6. Idempotency query finds EXISTING execution!
      const existingExecId = 'existing-exec-999';
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: existingExecId,
            workspace_id: WS_ID,
            project_id: PROJ_ID,
            automation_id: AUTO_ID,
            automation_version_id: VER_ID,
            trigger_type: 'NEW_WHATSAPP_MESSAGE',
            idempotency_key: `${AUTO_ID}:${VER_ID}:evt-duplicate`,
            status: 'QUEUED',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const event: DomainEvent = {
        id: 'evt-duplicate',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: {
          direction: 'inbound',
          body: 'Hello again',
        },
      };

      const result = await automationTriggerService.handle(event);

      expect(result.matchedCount).toBe(1);
      expect(result.duplicateCount).toBe(1);
      expect(result.createdExecutions.length).toBe(0); // No new execution created!
      expect(testEnqueuedAutomationJobs.length).toBe(0); // No new BullMQ job queued!
    });

    it('triggers multiple independent matching active workflows for a single event', async () => {
      const AUTO_ID_2 = '88888888-8888-8888-8888-888888888888';
      const VER_ID_2 = '77777777-7777-7777-7777-777777777777';
      const NODE_ID_2 = '66666666-6666-6666-6666-666666666666';

      // 1. Project check
      mockSql.mockResolvedValueOnce({ rows: [{ id: PROJ_ID }] });
      // 2. Active automations (2 active workflows)
      mockSql.mockResolvedValueOnce({
        rows: [
          { id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Workflow A', status: 'ACTIVE', current_version_id: VER_ID },
          { id: AUTO_ID_2, workspace_id: WS_ID, project_id: PROJ_ID, name: 'Workflow B', status: 'ACTIVE', current_version_id: VER_ID_2 },
        ],
      });

      // Workflow A: Version query
      mockSql.mockResolvedValueOnce({ rows: [{ id: VER_ID, status: 'PUBLISHED', version_number: 1 }] });
      // Workflow A: Nodes
      mockSql.mockResolvedValueOnce({
        rows: [{ id: NODE_ID, automation_version_id: VER_ID, node_key: 't1', type: 'NEW_WHATSAPP_MESSAGE', configuration: {} }],
      });
      // Workflow A: createExecution getAutomation check
      mockSql.mockResolvedValueOnce({ rows: [{ id: AUTO_ID, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }] });
      // Workflow A: idempotency check (empty)
      mockSql.mockResolvedValueOnce({ rows: [] });
      // Workflow A: insert execution
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'exec-A', workspace_id: WS_ID, project_id: PROJ_ID, automation_id: AUTO_ID, automation_version_id: VER_ID, trigger_type: 'NEW_WHATSAPP_MESSAGE', status: 'QUEUED', created_at: new Date(), updated_at: new Date() }],
      });

      // Workflow B: Version query
      mockSql.mockResolvedValueOnce({ rows: [{ id: VER_ID_2, status: 'PUBLISHED', version_number: 1 }] });
      // Workflow B: Nodes
      mockSql.mockResolvedValueOnce({
        rows: [{ id: NODE_ID_2, automation_version_id: VER_ID_2, node_key: 't2', type: 'NEW_WHATSAPP_MESSAGE', configuration: {} }],
      });
      // Workflow B: createExecution getAutomation check
      mockSql.mockResolvedValueOnce({ rows: [{ id: AUTO_ID_2, workspace_id: WS_ID, project_id: PROJ_ID, status: 'ACTIVE' }] });
      // Workflow B: idempotency check (empty)
      mockSql.mockResolvedValueOnce({ rows: [] });
      // Workflow B: insert execution
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'exec-B', workspace_id: WS_ID, project_id: PROJ_ID, automation_id: AUTO_ID_2, automation_version_id: VER_ID_2, trigger_type: 'NEW_WHATSAPP_MESSAGE', status: 'QUEUED', created_at: new Date(), updated_at: new Date() }],
      });

      const event: DomainEvent = {
        id: 'evt-multi',
        type: 'message.created',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        occurredAt: new Date().toISOString(),
        payload: { direction: 'inbound', body: 'Welcome message' },
      };

      const result = await automationTriggerService.handle(event);

      expect(result.matchedCount).toBe(2);
      expect(result.createdExecutions.length).toBe(2);
      expect(result.createdExecutions.map((e) => e.id)).toEqual(['exec-A', 'exec-B']);
      expect(testEnqueuedAutomationJobs.length).toBe(2);
    });
  });

  // ==========================================================================
  // 6. SCHEDULE SERVICE & SCHEDULED TRIGGER
  // ==========================================================================
  describe('AutomationScheduleService', () => {
    it('registers and unregisters repeatable schedules in test harness', async () => {
      await automationScheduleService.registerSchedule({
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
        cron: '0 9 * * 1-5',
        timezone: 'America/New_York',
      });

      expect(testRegisteredSchedules.has(AUTO_ID)).toBe(true);
      expect(testRegisteredSchedules.get(AUTO_ID)?.data.cron).toBe('0 9 * * 1-5');
      expect(testRegisteredSchedules.get(AUTO_ID)?.data.timezone).toBe('America/New_York');

      await automationScheduleService.unregisterSchedule(AUTO_ID);
      expect(testRegisteredSchedules.has(AUTO_ID)).toBe(false);
    });

    it('fires scheduled trigger producing scheduled.trigger domain event', async () => {
      const listener = vi.fn();
      domainEventDispatcher.subscribe('scheduled.trigger', listener);

      await automationScheduleService.fireScheduledTrigger({
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
        cron: '0 9 * * 1-5',
        timezone: 'UTC',
      });

      expect(listener).toHaveBeenCalledTimes(1);
      const emitted = listener.mock.calls[0][0];
      expect(emitted.type).toBe('scheduled.trigger');
      expect(emitted.payload.automationId).toBe(AUTO_ID);
      expect(emitted.metadata.source).toBe('scheduler');
    });
  });
});
