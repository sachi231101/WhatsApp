import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted SQL & Mocks ──────────────────────────────────────────────────────
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

vi.mock('@/lib/queue/outboundQueue', () => ({
  enqueueOutboundMessage: vi.fn().mockResolvedValue({ jobId: 'job_ai_outbound' }),
}));

// Mock KnowledgeSearchService
const mockSearchKnowledge = vi.fn();
vi.mock('@/lib/services/knowledge/knowledgeSearchService', () => ({
  KnowledgeSearchService: {
    searchKnowledge: (...args: any[]) => mockSearchKnowledge(...args),
  },
}));

// Imports
import { AiAgentExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/aiAgentExecutor';
import { AnalyzeSentimentExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/analyzeSentimentExecutor';
import { ExtractInformationExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/extractInformationExecutor';
import { GenerateSummaryExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/generateSummaryExecutor';
import { ActionExecutorRegistry } from '@/lib/services/automation/execution/executors/actionExecutorRegistry';
import { ActionExecutor } from '@/lib/services/automation/execution/executors/actionExecutor';
import { ActionIdempotencyService } from '@/lib/services/automation/execution/actionIdempotencyService';
import { VariableResolver } from '@/lib/services/automation/execution/variableResolver';
import { automationEngine } from '@/lib/services/automation/execution/automationEngine';
import { ExecutionContext } from '@/lib/services/automation/execution/types';
import { AutomationNodeRecord } from '@/lib/services/automation/types';
import { OpenAIProvider } from '@/lib/ai/providers/openAiProvider';
import { conditionEngine } from '@/lib/services/automation/conditions';
import { SendWhatsAppMessageExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/sendWhatsAppMessageExecutor';
import { SendInternalNoteExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/sendInternalNoteExecutor';
import { UpdateContactExecutor } from '@/lib/services/automation/execution/executors/actionExecutors/updateContactExecutor';
import { enqueueOutboundMessage } from '@/lib/queue/outboundQueue';

describe('PHASE 16: Automation AI Action Engine', () => {
  const WS_ID = '11111111-1111-1111-1111-111111111111';
  const PROJ_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_PROJ_ID = '99999999-9999-9999-9999-999999999999';
  const EXEC_ID = 'exec_ai_16';
  const AGENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const VERSION_ID = 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv';
  const CONV_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const CONTACT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  const baseAgentRow = {
    agent_id: AGENT_ID,
    name: 'Sales Assistant',
    status: 'ACTIVE',
    handling_mode: 'AI_HANDLING',
    current_version_id: VERSION_ID,
    version_id: VERSION_ID,
    version_number: 1,
    role: 'Course Sales Consultant',
    system_instructions: 'Help students enroll in MBA courses.',
    tone: 'Professional and enthusiastic',
    language: 'English',
    greeting_message: 'Hello! How can I help you choose the right course?',
    fallback_message: "I'm sorry, I cannot answer that right now.",
    response_behavior: {},
    escalation_enabled: true,
    escalation_message: 'Connecting you with an admissions counselor.',
    escalation_conditions: ['human', 'counselor', 'call me'],
    max_response_length: 250,
    temperature: 0.3,
    model: 'gpt-4o-mini',
    provider: 'openai',
    configuration: {},
  };

  const baseContext: ExecutionContext = {
    executionId: EXEC_ID,
    workspaceId: WS_ID,
    projectId: PROJ_ID,
    automationId: 'auto_16',
    automationVersionId: 'ver_16',
    triggerType: 'WHATSAPP_INCOMING_MESSAGE',
    contactId: CONTACT_ID,
    conversationId: CONV_ID,
    currentNodeId: 'node_ai_agent',
    visitedNodeIds: [],
    stepCount: 1,
    startedAt: Date.now(),
    variables: {
      message: {
        body: 'Can you give me the price of the MBA program?',
      },
    },
    metadata: {},
  };

  function createNode(def: Partial<AutomationNodeRecord> & { id: string; type: string }): AutomationNodeRecord {
    return {
      id: def.id,
      automationVersionId: def.automationVersionId || 'ver_16',
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

  beforeEach(() => {
    vi.clearAllMocks();
    ActionIdempotencyService.clear();
    mockSearchKnowledge.mockResolvedValue([]);

    // Default mock SQL router
    mockSql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
      const q = strings.join('?');

      // 1. Fetch AI Agent query
      if (q.includes('FROM ai_agents')) {
        const queryAgentId = values[0];
        const queryWsId = values[1];
        const queryProjId = values[2];

        if (queryAgentId === AGENT_ID && queryWsId === WS_ID && queryProjId === PROJ_ID) {
          return { rows: [baseAgentRow] };
        }
        return { rows: [] };
      }

      // 2. Fetch Conversation
      if (q.includes('FROM conversations')) {
        return {
          rows: [
            {
              id: CONV_ID,
              handling_mode: 'AI_HANDLING',
              status: 'OPEN',
              contact_id: CONTACT_ID,
              assigned_user_id: null as any,
            },
          ],
        };
      }

      // 3. Fetch Recent Messages
      if (q.includes('FROM messages')) {
        return {
          rows: [
            {
              direction: 'inbound',
              body: 'Can you give me the price of the MBA program?',
              type: 'text',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      // 4. Fetch Contact
      if (q.includes('FROM contacts')) {
        return {
          rows: [
            {
              id: CONTACT_ID,
              display_name: 'John Doe',
              phone_number: '+1234567890',
              email: 'john@example.com',
              lead_score: 50,
            },
          ],
        };
      }

      // 5. ai_usage inserts
      if (q.includes('INSERT INTO ai_usage')) {
        return { rows: [{ id: 'usage_1' }] };
      }

      return { rows: [] };
    });

    // Default mock AI completion handler
    OpenAIProvider.setTestMockHandler(async (opts) => {
      if (opts.responseFormat === 'json') {
        // Sentiment response
        if (opts.systemPrompt?.includes('sentiment analysis')) {
          return {
            content: JSON.stringify({ sentiment: 'POSITIVE', confidence: 0.96 }),
            usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
          };
        }
        // Extract info response
        if (opts.systemPrompt?.includes('entity extraction')) {
          return {
            content: JSON.stringify({
              course: 'MBA',
              budget: 50000,
              location: 'Mumbai',
              preferred_date: '2026-10-01',
              verified: true,
            }),
            usage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 },
          };
        }
        return {
          content: JSON.stringify({ result: 'ok' }),
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        };
      }

      // Summary
      if (opts.systemPrompt?.includes('summarizer')) {
        return {
          content: 'Customer is inquiring about pricing for the MBA program.',
          usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
        };
      }

      // Regular Agent response
      return {
        content: 'The tuition for our MBA program is $50,000 for the full 2-year curriculum.',
        usage: { promptTokens: 80, completionTokens: 25, totalTokens: 105 },
      };
    });
  });

  // ==========================================================================
  // 1. AI_AGENT NODE EXECUTOR
  // ==========================================================================
  describe('AI_AGENT Node Executor', () => {
    const aiAgentExecutor = new AiAgentExecutor();

    it('should successfully execute active AI agent with conversation context and RAG', async () => {
      mockSearchKnowledge.mockResolvedValueOnce([
        {
          chunkId: 'chunk_1',
          content: 'MBA program tuition fee is $50,000.',
          score: 0.88,
          sourceId: 'src_1',
          documentId: 'doc_1',
          sourceName: 'MBA Brochure',
          documentTitle: 'Tuition 2026',
          metadata: {},
        },
      ]);

      const node = createNode({
        id: 'node_ai_agent_1',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_agent_node',
        type: 'AI_AGENT',
        label: 'Sales AI Agent',
        configuration: {
          agentId: AGENT_ID,
          instruction: 'Highlight available scholarships if applicable.',
          useKnowledge: true,
        },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.action).toBe('AI_AGENT');
      expect(res.output?.responseGenerated).toBe(true);
      expect(res.output?.response).toContain('The tuition for our MBA program is $50,000');
      expect(res.output?.shouldEscalate).toBe(false);
      expect(res.output?.sourceCount).toBe(1);
      expect(res.output?.sources?.[0].title).toContain('MBA Brochure');
      expect(res.output?.provider).toBe('openai');
      expect(res.output?.model).toBe('gpt-4o-mini');
    });

    it('should reject agent belonging to another project (Tenant Isolation)', async () => {
      const node = createNode({
        id: 'node_cross_proj',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_agent_cross',
        type: 'AI_AGENT',
        label: 'Cross Project Agent',
        configuration: {
          agentId: 'other-agent-id',
        },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('AGENT_NOT_FOUND');
      expect(res.errorMessage).toContain('not found or does not belong to this project');
    });

    it('should reject DRAFT agent with AGENT_NOT_ACTIVE', async () => {
      mockSql.mockImplementationOnce(async () => ({
        rows: [{ ...baseAgentRow, status: 'DRAFT' }],
      }));

      const node = createNode({
        id: 'node_draft_agent',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_draft_node',
        type: 'AI_AGENT',
        label: 'Draft Agent',
        configuration: { agentId: AGENT_ID },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('AGENT_NOT_ACTIVE');
      expect(res.errorMessage).toContain('Only ACTIVE agents can execute');
    });

    it('should reject ARCHIVED agent with AGENT_NOT_ACTIVE', async () => {
      mockSql.mockImplementationOnce(async () => ({
        rows: [{ ...baseAgentRow, status: 'ARCHIVED' }],
      }));

      const node = createNode({
        id: 'node_archived_agent',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_archived_node',
        type: 'AI_AGENT',
        label: 'Archived Agent',
        configuration: { agentId: AGENT_ID },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('AGENT_NOT_ACTIVE');
    });

    it('should skip knowledge search when useKnowledge is false', async () => {
      const node = createNode({
        id: 'node_no_rag',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_no_rag',
        type: 'AI_AGENT',
        label: 'Agent No RAG',
        configuration: {
          agentId: AGENT_ID,
          useKnowledge: false,
        },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.sourceCount).toBe(0);
      expect(mockSearchKnowledge).not.toHaveBeenCalled();
    });

    it('should detect human escalation triggers and return escalation response', async () => {
      const escalationContext: ExecutionContext = {
        ...baseContext,
        variables: {
          message: {
            body: 'I want to talk to a human agent please',
          },
        },
      };

      const node = createNode({
        id: 'node_esc',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_esc',
        type: 'AI_AGENT',
        label: 'Agent Escalation',
        configuration: { agentId: AGENT_ID },
      });

      const res = await aiAgentExecutor.execute(node, escalationContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.shouldEscalate).toBe(true);
      expect(res.output?.escalationReason).toBeTruthy();
      expect(res.output?.response).toContain('Connecting you with an admissions counselor');
    });

    it('should respect HUMAN_HANDLING mode in conversation and skip automated AI reply', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const q = strings.join('?');
        if (q.includes('FROM ai_agents')) {
          return { rows: [baseAgentRow] };
        }
        if (q.includes('FROM conversations')) {
          return {
            rows: [
              {
                id: CONV_ID,
                handling_mode: 'HUMAN_HANDLING',
                status: 'OPEN',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const node = createNode({
        id: 'node_human_check',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_human_check',
        type: 'AI_AGENT',
        label: 'Agent Human Check',
        configuration: { agentId: AGENT_ID },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.skipped).toBe(true);
      expect(res.output?.responseGenerated).toBe(false);
      expect(res.output?.reason).toContain('HUMAN_HANDLING');
    });

    it('should fallback to agent fallbackMessage when AI response is empty', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: '',
        usage: { promptTokens: 10, completionTokens: 0, totalTokens: 10 },
      }));

      const node = createNode({
        id: 'node_fallback',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_fallback',
        type: 'AI_AGENT',
        label: 'Agent Fallback',
        configuration: { agentId: AGENT_ID },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.response).toBe("I'm sorry, I cannot answer that right now.");
    });

    it('should classify provider timeout into AI_TIMEOUT error', async () => {
      OpenAIProvider.setTestMockHandler(async () => {
        throw new Error('Request timed out after 25000ms');
      });

      const node = createNode({
        id: 'node_timeout',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_timeout',
        type: 'AI_AGENT',
        label: 'Agent Timeout',
        configuration: { agentId: AGENT_ID },
      });

      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('AI_TIMEOUT');
    });

    it('should record AI usage with source = AUTOMATION', async () => {
      let insertedSource: string | null = null;
      let insertedMetadata: any = null;

      mockSql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
        const q = strings.join('?');
        if (q.includes('FROM ai_agents')) {
          return { rows: [baseAgentRow] };
        }
        if (q.includes('FROM conversations')) {
          return { rows: [{ id: CONV_ID, handling_mode: 'AI_HANDLING' }] };
        }
        if (q.includes('FROM messages')) {
          return { rows: [] as any[] };
        }
        if (q.includes('INSERT INTO ai_usage')) {
          // values[12] is source, values[13] is metadata
          insertedSource = values.find((v) => v === 'AUTOMATION') || null;
          insertedMetadata = values.find((v) => typeof v === 'string' && v.includes('automationId'));
          return { rows: [{ id: 'usage_logged' }] };
        }
        return { rows: [] };
      });

      const node = createNode({
        id: 'node_usage_test',
        automationVersionId: 'ver_16',
        nodeKey: 'ai_usage_test',
        type: 'AI_AGENT',
        label: 'Agent Usage Test',
        configuration: { agentId: AGENT_ID },
      });

      await aiAgentExecutor.execute(node, baseContext);

      expect(insertedSource).toBe('AUTOMATION');
      expect(insertedMetadata).toBeTruthy();
    });
  });

  // ==========================================================================
  // 2. ANALYZE_SENTIMENT NODE EXECUTOR
  // ==========================================================================
  describe('ANALYZE_SENTIMENT Node Executor', () => {
    const sentimentExecutor = new AnalyzeSentimentExecutor();

    it('should classify sentiment across POSITIVE, NEUTRAL, NEGATIVE, MIXED with confidence', async () => {
      // Test POSITIVE
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({ sentiment: 'POSITIVE', confidence: 0.95 }),
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      }));

      const node = createNode({
        id: 'node_sent_pos',
        automationVersionId: 'ver_16',
        nodeKey: 'sent_pos',
        type: 'ANALYZE_SENTIMENT',
        label: 'Analyze Sentiment',
        configuration: { source: 'current_message' },
      });

      const resPos = await sentimentExecutor.execute(node, baseContext);
      expect(resPos.status).toBe('COMPLETED');
      expect(resPos.output?.sentiment).toBe('POSITIVE');
      expect(resPos.output?.confidence).toBe(0.95);

      // Test NEGATIVE
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({ sentiment: 'NEGATIVE', confidence: 0.88 }),
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      }));

      const resNeg = await sentimentExecutor.execute(node, baseContext);
      expect(resNeg.status).toBe('COMPLETED');
      expect(resNeg.output?.sentiment).toBe('NEGATIVE');
      expect(resNeg.output?.confidence).toBe(0.88);

      // Test NEUTRAL
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({ sentiment: 'NEUTRAL', confidence: 0.91 }),
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      }));

      const resNeut = await sentimentExecutor.execute(node, baseContext);
      expect(resNeut.status).toBe('COMPLETED');
      expect(resNeut.output?.sentiment).toBe('NEUTRAL');

      // Test MIXED
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({ sentiment: 'MIXED', confidence: 0.75 }),
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      }));

      const resMixed = await sentimentExecutor.execute(node, baseContext);
      expect(resMixed.status).toBe('COMPLETED');
      expect(resMixed.output?.sentiment).toBe('MIXED');
    });

    it('should reject invalid sentiment enum with INVALID_OUTPUT_SCHEMA', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({ sentiment: 'VERY_ANGRY', confidence: 0.99 }),
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      }));

      const node = createNode({
        id: 'node_sent_inv',
        automationVersionId: 'ver_16',
        nodeKey: 'sent_inv',
        type: 'ANALYZE_SENTIMENT',
        label: 'Analyze Sentiment Invalid',
        configuration: {},
      });

      const res = await sentimentExecutor.execute(node, baseContext);
      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('INVALID_OUTPUT_SCHEMA');
    });

    it('should fail with INVALID_OUTPUT_SCHEMA if AI returns non-JSON text', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: 'The user seems mostly happy!',
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      }));

      const node = createNode({
        id: 'node_sent_bad_json',
        automationVersionId: 'ver_16',
        nodeKey: 'sent_bad_json',
        type: 'ANALYZE_SENTIMENT',
        label: 'Analyze Sentiment Bad JSON',
        configuration: {},
      });

      const res = await sentimentExecutor.execute(node, baseContext);
      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('INVALID_OUTPUT_SCHEMA');
    });
  });

  // ==========================================================================
  // 3. EXTRACT_INFORMATION NODE EXECUTOR
  // ==========================================================================
  describe('EXTRACT_INFORMATION Node Executor', () => {
    const extractExecutor = new ExtractInformationExecutor();

    it('should extract structured typed entities matching schema', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({
          course: 'Data Science Masterclass',
          budget: 25000,
          verified: true,
          preferred_date: '2026-11-15',
          tier: 'Premium',
        }),
        usage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 },
      }));

      const node = createNode({
        id: 'node_extract_1',
        automationVersionId: 'ver_16',
        nodeKey: 'extract_info',
        type: 'EXTRACT_INFORMATION',
        label: 'Extract Information',
        configuration: {
          fields: [
            { name: 'course', type: 'string', required: true },
            { name: 'budget', type: 'number' },
            { name: 'verified', type: 'boolean' },
            { name: 'preferred_date', type: 'date' },
            { name: 'tier', type: 'enum', options: ['Basic', 'Premium', 'Enterprise'] },
          ],
        },
      });

      const res = await extractExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.action).toBe('EXTRACT_INFORMATION');
      expect(res.output?.extracted?.course).toBe('Data Science Masterclass');
      expect(res.output?.extracted?.budget).toBe(25000);
      expect(res.output?.extracted?.verified).toBe(true);
      expect(res.output?.extracted?.preferred_date).toBe('2026-11-15');
      expect(res.output?.extracted?.tier).toBe('Premium');
    });

    it('should reject missing required field with INVALID_OUTPUT_SCHEMA', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({
          notes: 'Customer inquired about general info',
        }),
        usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
      }));

      const node = createNode({
        id: 'node_extract_req',
        automationVersionId: 'ver_16',
        nodeKey: 'extract_req',
        type: 'EXTRACT_INFORMATION',
        label: 'Extract Required Field',
        configuration: {
          fields: [{ name: 'course', type: 'string', required: true }],
        },
      });

      const res = await extractExecutor.execute(node, baseContext);
      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('INVALID_OUTPUT_SCHEMA');
      expect(res.errorMessage).toContain('Required extraction field "course" was not found');
    });

    it('should reject invalid enum value with INVALID_OUTPUT_SCHEMA when required', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: JSON.stringify({
          tier: 'UltraVIP', // not in allowed options
        }),
        usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
      }));

      const node = createNode({
        id: 'node_extract_enum',
        automationVersionId: 'ver_16',
        nodeKey: 'extract_enum',
        type: 'EXTRACT_INFORMATION',
        label: 'Extract Enum',
        configuration: {
          fields: [{ name: 'tier', type: 'enum', options: ['Basic', 'Premium'], required: true }],
        },
      });

      const res = await extractExecutor.execute(node, baseContext);
      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('INVALID_OUTPUT_SCHEMA');
    });
  });

  // ==========================================================================
  // 4. GENERATE_SUMMARY NODE EXECUTOR
  // ==========================================================================
  describe('GENERATE_SUMMARY Node Executor', () => {
    const summaryExecutor = new GenerateSummaryExecutor();

    it('should generate a bounded executive summary of conversation messages', async () => {
      OpenAIProvider.setTestMockHandler(async () => ({
        content: 'Customer is exploring MBA options and budget plans for late 2026.',
        usage: { promptTokens: 60, completionTokens: 15, totalTokens: 75 },
      }));

      const node = createNode({
        id: 'node_summary_1',
        automationVersionId: 'ver_16',
        nodeKey: 'summary_node',
        type: 'GENERATE_SUMMARY',
        label: 'Generate Summary',
        configuration: {
          scope: 'recent',
          focus: 'budget and timeline',
        },
      });

      const res = await summaryExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.action).toBe('GENERATE_SUMMARY');
      expect(res.output?.summary).toContain('Customer is exploring MBA options');
    });

    it('should handle empty conversation gracefully with internal fallback summary', async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
        const q = strings.join('?');
        if (q.includes('FROM messages')) {
          return { rows: [] as any[] }; // No messages
        }
        return { rows: [] as any[] };
      });

      const node = createNode({
        id: 'node_summary_empty',
        automationVersionId: 'ver_16',
        nodeKey: 'summary_empty',
        type: 'GENERATE_SUMMARY',
        label: 'Summary Empty',
        configuration: {},
      });

      const res = await summaryExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      expect(res.output?.summary).toContain('No recent conversation history available');
    });
  });

  // ==========================================================================
  // 5. ACTION IDEMPOTENCY
  // ==========================================================================
  describe('AI Action Idempotency', () => {
    it('should not call AI provider twice when executing with same executionId and nodeId', async () => {
      let providerCalls = 0;
      OpenAIProvider.setTestMockHandler(async () => {
        providerCalls++;
        return {
          content: 'Idempotency response test',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const node = createNode({
        id: 'node_idem_ai',
        automationVersionId: 'ver_16',
        nodeKey: 'idem_ai',
        type: 'AI_AGENT',
        label: 'Idempotency AI Agent',
        configuration: { agentId: AGENT_ID },
      });

      const actionExecutor = new ActionExecutor();

      // First run: calls provider
      const res1 = await actionExecutor.execute(node, baseContext);
      expect(res1.status).toBe('COMPLETED');
      expect(providerCalls).toBe(1);

      // Second run (simulating worker retry): should return cached idempotency record
      const res2 = await actionExecutor.execute(node, baseContext);
      expect(res2.status).toBe('COMPLETED');
      expect(res2.output?.deduplicated).toBe(true);
      expect(providerCalls).toBe(1); // Provider NOT called again
    });
  });

  // ==========================================================================
  // 6. VARIABLE RESOLUTION & DOWNSTREAM WORKFLOW INTEGRATION
  // ==========================================================================
  describe('Downstream Workflow Integration', () => {
    it('should resolve {{ai.response}} in SEND_WHATSAPP_MESSAGE node', async () => {
      const mockContactService = {
        getContactById: vi.fn().mockResolvedValue({
          id: CONTACT_ID,
          displayName: 'John Doe',
          phoneNumber: '+1234567890',
        }),
      } as any;
      const mockConnectionService = {
        getProjectConnection: vi.fn().mockResolvedValue({
          id: 'conn_1',
          status: 'CONNECTED',
          phoneNumberId: 'phone_123',
        }),
      } as any;
      const mockInboxService = {
        isCustomerWindowActive: vi.fn().mockResolvedValue(true),
        getOrCreateActiveConversation: vi.fn().mockResolvedValue({ id: CONV_ID }),
        getConversationDetails: vi.fn().mockResolvedValue({
          id: CONV_ID,
          status: 'OPEN',
          handling_mode: 'AI_HANDLING',
          window_expires_at: new Date(Date.now() + 86400000).toISOString(),
        }),
        sendOutboundMessage: vi.fn().mockImplementation(async (params: any) => {
          await enqueueOutboundMessage({ body: params.content, to: params.recipientPhone } as any);
          return { message: { id: 'msg_1' }, jobId: 'job_1' };
        }),
      } as any;

      const sendWhatsAppExecutor = new SendWhatsAppMessageExecutor(
        mockContactService,
        mockConnectionService,
        mockInboxService
      );

      const contextWithAiOutput: ExecutionContext = {
        ...baseContext,
        variables: {
          ai: {
            response: 'Here are the details for our 2026 MBA program.',
          },
        },
      };

      const node = createNode({
        id: 'node_send_wa',
        automationVersionId: 'ver_16',
        nodeKey: 'send_wa',
        type: 'SEND_WHATSAPP_MESSAGE',
        label: 'Send AI Response to WhatsApp',
        configuration: {
          message: '{{ai.response}}',
        },
      });

      const res = await sendWhatsAppExecutor.execute(node, contextWithAiOutput);

      expect(res.status).toBe('COMPLETED');
      expect(enqueueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Here are the details for our 2026 MBA program.',
        })
      );
    });

    it('should resolve {{ai.summary}} in SEND_INTERNAL_NOTE node', async () => {
      const sendNoteExecutor = new SendInternalNoteExecutor();

      let insertedNoteContent: string | null = null;
      mockSql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
        const q = strings.join('?');
        if (q.includes('FROM conversations')) {
          return { rows: [{ id: CONV_ID }] };
        }
        if (q.includes('INSERT INTO internal_notes')) {
          insertedNoteContent = values[3];
          return { rows: [{ id: 'note_123' }] };
        }
        return { rows: [] };
      });

      const contextWithSummary: ExecutionContext = {
        ...baseContext,
        variables: {
          ai: {
            summary: 'Customer requested MBA tuition fee structure.',
          },
        },
      };

      const node = createNode({
        id: 'node_note',
        automationVersionId: 'ver_16',
        nodeKey: 'note_node',
        type: 'SEND_INTERNAL_NOTE',
        label: 'Record AI Summary Note',
        configuration: {
          noteContent: 'Summary: {{ai.summary}}',
        },
      });

      const res = await sendNoteExecutor.execute(node, contextWithSummary);

      expect(res.status).toBe('COMPLETED');
      expect(insertedNoteContent).toBe('Summary: Customer requested MBA tuition fee structure.');
    });

    it('should evaluate sentiment in downstream Condition node without re-invoking AI provider', async () => {
      let aiCallCount = 0;
      OpenAIProvider.setTestMockHandler(async () => {
        aiCallCount++;
        return {
          content: 'Sentiment analysis should not be called in condition',
        };
      });

      const contextWithSentiment = {
        automationVersionId: 'ver_16',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: 'auto_16',
        executionId: EXEC_ID,
        contactId: CONTACT_ID,
        conversationId: CONV_ID,
        variables: {
          ai: {
            sentiment: 'NEGATIVE',
            confidence: 0.94,
          },
        },
      };

      const conditionNode = {
        type: 'CUSTOM_FIELD',
        configuration: {
          fieldId: 'ai.sentiment',
          operator: 'equals',
          value: 'NEGATIVE',
        },
      };

      const evalResult = await conditionEngine.evaluate(conditionNode, contextWithSentiment);

      expect(evalResult.matched).toBe(true);
      expect(evalResult.branch).toBe('YES');
      expect(evalResult.evaluatedValue).toBe('NEGATIVE');
      // AI provider must NOT be re-invoked
      expect(aiCallCount).toBe(0);
    });

    it('should allow UPDATE_CONTACT to consume extracted entities via {{ai.extracted.budget}}', () => {
      const contextWithExtracted: ExecutionContext = {
        ...baseContext,
        variables: {
          ai: {
            extracted: {
              budget: 75000,
              course: 'Executive MBA',
            },
          },
        },
      };

      const resolvedBudget = VariableResolver.resolveString('Budget: {{ai.extracted.budget}}', contextWithExtracted);
      const resolvedCourse = VariableResolver.resolveString('Course: {{ai.extracted.course}}', contextWithExtracted);

      expect(resolvedBudget).toBe('Budget: 75000');
      expect(resolvedCourse).toBe('Course: Executive MBA');
    });
  });

  // ==========================================================================
  // 7. SECURITY & ERROR RESILIENCE
  // ==========================================================================
  describe('Security & Error Resilience', () => {
    it('should not leak AI API keys or provider secrets in execution step output', async () => {
      const node = createNode({
        id: 'node_sec_test',
        automationVersionId: 'ver_16',
        nodeKey: 'sec_test',
        type: 'AI_AGENT',
        label: 'Security Check Agent',
        configuration: { agentId: AGENT_ID },
      });

      const aiAgentExecutor = new AiAgentExecutor();
      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('COMPLETED');
      const outputJson = JSON.stringify(res.output);
      expect(outputJson).not.toContain('Bearer');
      expect(outputJson).not.toContain('apiKey');
      expect(outputJson).not.toContain('sk-');
      expect(outputJson).not.toContain('OPENAI_API_KEY');
    });

    it('should classify rate limit error as AI_RATE_LIMITED', async () => {
      OpenAIProvider.setTestMockHandler(async () => {
        throw new Error('429 Too Many Requests: Rate limit exceeded');
      });

      const node = createNode({
        id: 'node_rate_limit',
        automationVersionId: 'ver_16',
        nodeKey: 'rate_limit',
        type: 'AI_AGENT',
        label: 'Rate Limited Agent',
        configuration: { agentId: AGENT_ID },
      });

      const aiAgentExecutor = new AiAgentExecutor();
      const res = await aiAgentExecutor.execute(node, baseContext);

      expect(res.status).toBe('FAILED');
      expect(res.errorCode).toBe('AI_RATE_LIMITED');
    });
  });
});
