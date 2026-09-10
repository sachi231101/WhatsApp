import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted SQL & AI Mocks ───────────────────────────────────────────────────
const { mockSql, sqlMockObj, mockAiProvider } = vi.hoisted(() => {
  const mockFn: any = vi.fn();
  mockFn.query = vi.fn().mockResolvedValue({ rows: [] as any[] });
  const obj = Object.assign((...args: any[]) => mockFn(...args), {
    query: (...args: any[]) => mockFn.query(...args),
  });

  const aiProvider = {
    name: 'openai',
    defaultModel: 'gpt-4o-mini',
    generateStructuredOutput: vi.fn(),
    generateResponse: vi.fn(),
    countTokens: vi.fn().mockReturnValue(10),
    healthCheck: vi.fn().mockResolvedValue({ ok: true }),
  };

  return {
    mockSql: mockFn,
    sqlMockObj: obj,
    mockAiProvider: aiProvider,
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

vi.mock('@/lib/ai/providers/aiProviderFactory', () => ({
  AIProviderFactory: {
    getProvider: vi.fn(() => mockAiProvider),
    getSupportedProviders: vi.fn().mockReturnValue([
      { id: 'openai', name: 'OpenAI', models: ['gpt-4o-mini'] },
    ]),
  },
}));

// Imports
import {
  conditionEngine,
  ConditionValidator,
  ConditionEvaluatorRegistry,
  conditionObservability,
  evaluateStringOperator,
  evaluateNumericOperator,
  evaluateDateOperator,
  evaluateBooleanOperator,
  evaluateArrayOperator,
  ConditionExecutionContext,
} from '@/lib/services/automation/conditions';

describe('PHASE 11: Automation Condition Engine', () => {
  const WS_ID = '11111111-1111-1111-1111-111111111111';
  const PROJ_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_PROJ_ID = '99999999-9999-9999-9999-999999999999';
  const AUTO_ID = '33333333-3333-3333-3333-333333333333';
  const VER_ID = '44444444-4444-4444-4444-444444444444';
  const EXEC_ID = 'exec_12345';
  const CONTACT_ID = 'ct_12345';
  const CONV_ID = 'conv_12345';

  const baseContext: ConditionExecutionContext = {
    workspaceId: WS_ID,
    projectId: PROJ_ID,
    automationId: AUTO_ID,
    automationVersionId: VER_ID,
    executionId: EXEC_ID,
    contactId: CONTACT_ID,
    conversationId: CONV_ID,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    conditionObservability.resetMetrics();
    mockSql.mockResolvedValue({ rows: [] });
  });

  // ============================================================================
  // 1. Comparison Operators Layer
  // ============================================================================
  describe('Comparison Operators Layer', () => {
    it('evaluates string operators (case sensitive and insensitive)', () => {
      expect(evaluateStringOperator('contains', 'Hello World', 'world')).toBe(true);
      expect(evaluateStringOperator('contains', 'Hello World', 'world', { caseSensitive: true })).toBe(false);
      expect(evaluateStringOperator('not_contains', 'Hello World', 'foo')).toBe(true);
      expect(evaluateStringOperator('equals', '  Course  ', 'course')).toBe(true);
      expect(evaluateStringOperator('not_equals', 'course', 'pricing')).toBe(true);
      expect(evaluateStringOperator('starts_with', 'Welcome to Wazzi', 'welcome')).toBe(true);
      expect(evaluateStringOperator('ends_with', 'Course Details', 'details')).toBe(true);
      expect(evaluateStringOperator('exists', 'some text', '')).toBe(true);
      expect(evaluateStringOperator('exists', '', '')).toBe(false);
      expect(evaluateStringOperator('not_exists', null, '')).toBe(true);
    });

    it('evaluates whole word boundaries correctly', () => {
      expect(evaluateStringOperator('contains', 'We have coursework available', 'course', { wholeWord: true })).toBe(false);
      expect(evaluateStringOperator('contains', 'We have course available', 'course', { wholeWord: true })).toBe(true);
    });

    it('evaluates numeric operators safely without unsafe coercion', () => {
      expect(evaluateNumericOperator('equals', 70, 70)).toBe(true);
      expect(evaluateNumericOperator('equals', '70', 70)).toBe(true); // safely parsed
      expect(evaluateNumericOperator('equals', 'not_a_num', 70)).toBe(false); // does not crash
      expect(evaluateNumericOperator('greater_than', 80, 70)).toBe(true);
      expect(evaluateNumericOperator('greater_than_or_equal', 70, 70)).toBe(true);
      expect(evaluateNumericOperator('less_than', 50, 70)).toBe(true);
      expect(evaluateNumericOperator('less_than_or_equal', 70, 70)).toBe(true);
      expect(evaluateNumericOperator('not_equals', 50, 70)).toBe(true);
    });

    it('evaluates date operators correctly', () => {
      const earlier = '2026-09-01T00:00:00.000Z';
      const later = '2026-09-10T00:00:00.000Z';
      expect(evaluateDateOperator('before', earlier, later)).toBe(true);
      expect(evaluateDateOperator('after', later, earlier)).toBe(true);
      expect(evaluateDateOperator('equals', earlier, earlier)).toBe(true);
      expect(evaluateDateOperator('before', 'invalid-date', later)).toBe(false);
    });

    it('evaluates boolean operators correctly', () => {
      expect(evaluateBooleanOperator('equals', true, true)).toBe(true);
      expect(evaluateBooleanOperator('equals', true, 'true')).toBe(true);
      expect(evaluateBooleanOperator('equals', false, 'false')).toBe(true);
      expect(evaluateBooleanOperator('equals', true, false)).toBe(false);
      expect(evaluateBooleanOperator('not_equals', true, false)).toBe(true);
    });

    it('evaluates array operators correctly', () => {
      expect(evaluateArrayOperator('matches_any', ['VIP', 'Lead'], ['vip'])).toBe(true);
      expect(evaluateArrayOperator('matches_all', ['VIP', 'Lead'], ['vip', 'lead'])).toBe(true);
      expect(evaluateArrayOperator('matches_all', ['VIP'], ['vip', 'partner'])).toBe(false);
      expect(evaluateArrayOperator('does_not_have', ['Lead'], ['vip'])).toBe(true);
      expect(evaluateArrayOperator('does_not_have', ['VIP', 'Lead'], ['vip'])).toBe(false);
    });
  });

  // ============================================================================
  // 2. Condition Validator
  // ============================================================================
  describe('Condition Validator', () => {
    it('validates supported condition types', () => {
      expect(ConditionValidator.isSupportedType('MESSAGE_CONTAINS')).toBe(true);
      expect(ConditionValidator.isSupportedType('CONTACT_TAG')).toBe(true);
      expect(ConditionValidator.isSupportedType('LEAD_SCORE')).toBe(true);
      expect(ConditionValidator.isSupportedType('CUSTOM_FIELD')).toBe(true);
      expect(ConditionValidator.isSupportedType('TIME_CONDITION')).toBe(true);
      expect(ConditionValidator.isSupportedType('CONVERSATION_STATUS')).toBe(true);
      expect(ConditionValidator.isSupportedType('CONVERSATION_ASSIGNEE')).toBe(true);
      expect(ConditionValidator.isSupportedType('AI_INTENT')).toBe(true);
      expect(ConditionValidator.isSupportedType('UNKNOWN_CONDITION')).toBe(false);
    });

    it('rejects invalid configurations gracefully', () => {
      const v1 = ConditionValidator.validate('LEAD_SCORE', { operator: 'greater_than', value: 150 });
      expect(v1.valid).toBe(false);
      expect(v1.errorCode).toBe('INVALID_RANGE');

      const v2 = ConditionValidator.validate('TIME_CONDITION', { timezone: 'Invalid/Zone' });
      expect(v2.valid).toBe(false);
      expect(v2.errorCode).toBe('INVALID_TIMEZONE');

      const v3 = ConditionValidator.validate('CONVERSATION_STATUS', { status: 'INVALID_STATUS' });
      expect(v3.valid).toBe(false);
      expect(v3.errorCode).toBe('INVALID_CONFIGURATION');
    });
  });

  // ============================================================================
  // 3. Condition Evaluator Registry
  // ============================================================================
  describe('Evaluator Registry', () => {
    it('resolves all 8 condition evaluators by node type', () => {
      const types = [
        'MESSAGE_CONTAINS',
        'CONTACT_TAG',
        'LEAD_SCORE',
        'CUSTOM_FIELD',
        'TIME_CONDITION',
        'CONVERSATION_STATUS',
        'CONVERSATION_ASSIGNEE',
        'AI_INTENT',
      ];

      for (const t of types) {
        const evaluator = ConditionEvaluatorRegistry.get(t);
        expect(evaluator).toBeDefined();
        expect(evaluator?.type).toBe(t);
      }
    });
  });

  // ============================================================================
  // 4. MESSAGE_CONTAINS Evaluator
  // ============================================================================
  describe('MESSAGE_CONTAINS', () => {
    it('returns YES when incoming message contains target phrase', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'MESSAGE_CONTAINS',
          configuration: {
            operator: 'contains',
            value: 'course',
            caseSensitive: false,
          },
        },
        {
          ...baseContext,
          message: { body: 'Can you send me course details?' },
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue).toBe('can you send me course details?');
    });

    it('returns NO when message does not contain target phrase', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'MESSAGE_CONTAINS',
          configuration: {
            operator: 'contains',
            value: 'pricing',
          },
        },
        {
          ...baseContext,
          message: { body: 'Hello there' },
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
    });

    it('supports starts_with, ends_with, equals, and not_contains', async () => {
      const msg = { body: 'Hello world from Wazzi' };

      const r1 = await conditionEngine.evaluate(
        { type: 'MESSAGE_CONTAINS', configuration: { operator: 'starts_with', value: 'hello' } },
        { ...baseContext, message: msg }
      );
      expect(r1.matched).toBe(true);

      const r2 = await conditionEngine.evaluate(
        { type: 'MESSAGE_CONTAINS', configuration: { operator: 'ends_with', value: 'wazzi' } },
        { ...baseContext, message: msg }
      );
      expect(r2.matched).toBe(true);

      const r3 = await conditionEngine.evaluate(
        { type: 'MESSAGE_CONTAINS', configuration: { operator: 'equals', value: 'hello world from wazzi' } },
        { ...baseContext, message: msg }
      );
      expect(r3.matched).toBe(true);

      const r4 = await conditionEngine.evaluate(
        { type: 'MESSAGE_CONTAINS', configuration: { operator: 'not_contains', value: 'python' } },
        { ...baseContext, message: msg }
      );
      expect(r4.matched).toBe(true);
    });

    it('handles empty message or missing message without crashing', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'MESSAGE_CONTAINS',
          configuration: { value: 'course' },
        },
        {
          ...baseContext,
          message: null,
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('MISSING_MESSAGE');
    });

    it('respects caseSensitive option and whitespace normalization', async () => {
      const resultSens = await conditionEngine.evaluate(
        {
          type: 'MESSAGE_CONTAINS',
          configuration: { value: 'Course', caseSensitive: true },
        },
        {
          ...baseContext,
          message: { body: 'can you send course details?' },
        }
      );
      expect(resultSens.matched).toBe(false);

      const resultNorm = await conditionEngine.evaluate(
        {
          type: 'MESSAGE_CONTAINS',
          configuration: { value: 'course' },
        },
        {
          ...baseContext,
          message: { body: '   Can you send COURSE details?   ' },
        }
      );
      expect(resultNorm.matched).toBe(true);
    });
  });

  // ============================================================================
  // 5. CONTACT_TAG Evaluator
  // ============================================================================
  describe('CONTACT_TAG', () => {
    it('evaluates YES when contact currently has the tag', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'CONTACT_TAG',
          configuration: {
            tagName: 'VIP',
            operator: 'has',
          },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 85,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [{ id: 'tag_1', name: 'VIP', color: '#1b59f8' }],
          },
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue).toEqual(['VIP']);
    });

    it('evaluates NO when contact lacks the tag', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'CONTACT_TAG',
          configuration: {
            tagName: 'Enterprise',
            operator: 'has',
          },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 85,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [{ id: 'tag_1', name: 'VIP', color: '#1b59f8' }],
          },
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
    });

    it('supports does_not_have operator', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'CONTACT_TAG',
          configuration: {
            tagName: 'Churned',
            operator: 'does_not_have',
          },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 85,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [{ id: 'tag_1', name: 'VIP', color: '#1b59f8' }],
          },
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
    });

    it('rejects cross-project contact with TENANT_VIOLATION', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'CONTACT_TAG',
          configuration: { tagName: 'VIP' },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: OTHER_PROJ_ID, // Different project!
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 85,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [{ id: 'tag_1', name: 'VIP', color: '#1b59f8' }],
          },
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('TENANT_VIOLATION');
    });
  });

  // ============================================================================
  // 6. LEAD_SCORE Evaluator
  // ============================================================================
  describe('LEAD_SCORE', () => {
    it('evaluates greater_than operator against contact lead score', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'LEAD_SCORE',
          configuration: {
            operator: 'greater_than',
            value: 70,
          },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 85,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue).toBe(85);
    });

    it('tests boundary 0 and boundary 100', async () => {
      const r0 = await conditionEngine.evaluate(
        {
          type: 'LEAD_SCORE',
          configuration: { operator: 'greater_than_or_equal', value: 0 },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 0,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      );
      expect(r0.matched).toBe(true);

      const r100 = await conditionEngine.evaluate(
        {
          type: 'LEAD_SCORE',
          configuration: { operator: 'equals', value: 100 },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: 100,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      );
      expect(r100.matched).toBe(true);
    });

    it('handles null score explicitly without silently treating as 0', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'LEAD_SCORE',
          configuration: { operator: 'greater_than', value: 10 },
        },
        {
          ...baseContext,
          contact: {
            id: CONTACT_ID,
            workspaceId: WS_ID,
            projectId: PROJ_ID,
            displayName: 'Alice',
            phoneNumber: '+123456789',
            status: 'ACTIVE',
            leadScore: null as any,
            source: 'WHATSAPP',
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.reason).toContain('null');
    });

    it('rejects invalid score configuration (> 100)', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'LEAD_SCORE',
          configuration: { operator: 'greater_than', value: 120 },
        },
        baseContext
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('INVALID_RANGE');
    });
  });

  // ============================================================================
  // 7. CUSTOM_FIELD Evaluator
  // ============================================================================
  describe('CUSTOM_FIELD', () => {
    it('evaluates TEXT, NUMBER, BOOLEAN, and SELECT custom fields', async () => {
      const contextWithFields: ConditionExecutionContext = {
        ...baseContext,
        customFieldValues: [
          {
            definitionId: 'field_role',
            name: 'Role',
            key: 'role',
            type: 'TEXT',
            value: 'student',
          },
          {
            definitionId: 'field_experience',
            name: 'Years Experience',
            key: 'years_experience',
            type: 'NUMBER',
            value: 5,
          },
          {
            definitionId: 'field_verified',
            name: 'Is Verified',
            key: 'is_verified',
            type: 'BOOLEAN',
            value: true,
          },
          {
            definitionId: 'field_tier',
            name: 'Tier',
            key: 'tier',
            type: 'SELECT',
            value: 'Gold',
          },
        ],
      };

      // TEXT match
      const rText = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_role',
            operator: 'equals',
            value: 'student',
          },
        },
        contextWithFields
      );
      expect(rText.matched).toBe(true);
      expect(rText.branch).toBe('YES');

      // NUMBER match
      const rNum = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_experience',
            operator: 'greater_than',
            value: 3,
          },
        },
        contextWithFields
      );
      expect(rNum.matched).toBe(true);
      expect(rNum.branch).toBe('YES');

      // BOOLEAN match
      const rBool = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_verified',
            operator: 'equals',
            value: true,
          },
        },
        contextWithFields
      );
      expect(rBool.matched).toBe(true);
      expect(rBool.branch).toBe('YES');

      // SELECT match
      const rSelect = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_tier',
            operator: 'equals',
            value: 'Gold',
          },
        },
        contextWithFields
      );
      expect(rSelect.matched).toBe(true);
      expect(rSelect.branch).toBe('YES');
    });

    it('returns MISSING_FIELD when field does not exist in project', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_unknown',
            operator: 'equals',
            value: 'test',
          },
        },
        {
          ...baseContext,
          customFieldValues: [],
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('MISSING_FIELD');
    });

    it('rejects invalid operator for field type with INVALID_OPERATOR', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_verified',
            operator: 'greater_than', // Invalid for BOOLEAN
            value: true,
          },
        },
        {
          ...baseContext,
          customFieldValues: [
            {
              definitionId: 'field_verified',
              name: 'Is Verified',
              key: 'is_verified',
              type: 'BOOLEAN',
              value: true,
            },
          ],
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('INVALID_OPERATOR');
    });

    it('fetches custom field values from DB when not in context', async () => {
      mockSql.mockImplementation((strings: any) => {
        const queryStr = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (queryStr.includes('custom_field_definitions')) {
          return Promise.resolve({
            rows: [
              {
                definition_id: 'field_remote',
                name: 'Remote Field',
                key: 'remote_field',
                type: 'TEXT',
                required: false,
                options: [],
                value: 'success',
              },
            ],
          });
        }
        if (queryStr.includes('FROM contacts')) {
          return Promise.resolve({
            rows: [
              {
                id: CONTACT_ID,
                workspace_id: WS_ID,
                project_id: PROJ_ID,
                phone_number: '+123456789',
                lead_score: 80,
                status: 'ACTIVE',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await conditionEngine.evaluate(
        {
          type: 'CUSTOM_FIELD',
          configuration: {
            fieldId: 'field_remote',
            operator: 'equals',
            value: 'success',
          },
        },
        baseContext
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue).toBe('success');
    });
  });

  // ============================================================================
  // 8. TIME_CONDITION Evaluator & Overnight Window
  // ============================================================================
  describe('TIME_CONDITION', () => {
    it('evaluates inside business hours window', async () => {
      // 2026-09-08 is Tuesday. 11:30 UTC.
      const testDate = '2026-09-08T11:30:00.000Z';

      const result = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '09:00',
            endTime: '18:00',
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          },
        },
        {
          ...baseContext,
          occurredAt: testDate,
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue?.weekday).toBe('TUESDAY');
      expect(result.evaluatedValue?.time).toBe('11:30');
    });

    it('evaluates outside business hours window (wrong time of day)', async () => {
      // 2026-09-08 20:00 UTC (after 18:00)
      const testDate = '2026-09-08T20:00:00.000Z';

      const result = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '09:00',
            endTime: '18:00',
            days: ['TUESDAY'],
          },
        },
        {
          ...baseContext,
          occurredAt: testDate,
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
    });

    it('evaluates outside business hours window (wrong day of week)', async () => {
      // 2026-09-13 is Sunday. 12:00 UTC.
      const testDate = '2026-09-13T12:00:00.000Z';

      const result = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '09:00',
            endTime: '18:00',
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          },
        },
        {
          ...baseContext,
          occurredAt: testDate,
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
    });

    it('handles exact boundary start and end times inclusively', async () => {
      // Exact start: 09:00 UTC
      const rStart = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '09:00',
            endTime: '18:00',
          },
        },
        {
          ...baseContext,
          occurredAt: '2026-09-08T09:00:00.000Z',
        }
      );
      expect(rStart.matched).toBe(true);

      // Exact end: 18:00 UTC
      const rEnd = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '09:00',
            endTime: '18:00',
          },
        },
        {
          ...baseContext,
          occurredAt: '2026-09-08T18:00:00.000Z',
        }
      );
      expect(rEnd.matched).toBe(true);
    });

    it('handles overnight time windows correctly (22:00 -> 06:00)', async () => {
      // 23:30 is inside overnight window
      const rLate = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '22:00',
            endTime: '06:00',
          },
        },
        {
          ...baseContext,
          occurredAt: '2026-09-08T23:30:00.000Z',
        }
      );
      expect(rLate.matched).toBe(true);
      expect(rLate.branch).toBe('YES');

      // 04:15 is inside overnight window
      const rEarly = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '22:00',
            endTime: '06:00',
          },
        },
        {
          ...baseContext,
          occurredAt: '2026-09-08T04:15:00.000Z',
        }
      );
      expect(rEarly.matched).toBe(true);
      expect(rEarly.branch).toBe('YES');

      // 14:00 is outside overnight window
      const rMidday = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'UTC',
            startTime: '22:00',
            endTime: '06:00',
          },
        },
        {
          ...baseContext,
          occurredAt: '2026-09-08T14:00:00.000Z',
        }
      );
      expect(rMidday.matched).toBe(false);
      expect(rMidday.branch).toBe('NO');
    });

    it('correctly converts timezones (e.g. Asia/Kolkata is UTC+5:30)', async () => {
      // 04:00 UTC is 09:30 IST in Asia/Kolkata
      const testDate = '2026-09-08T04:00:00.000Z';

      const result = await conditionEngine.evaluate(
        {
          type: 'TIME_CONDITION',
          configuration: {
            timezone: 'Asia/Kolkata',
            startTime: '09:00',
            endTime: '18:00',
          },
        },
        {
          ...baseContext,
          occurredAt: testDate,
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue?.time).toBe('09:30');
    });
  });

  // ============================================================================
  // 9. CONVERSATION_STATUS Evaluator
  // ============================================================================
  describe('CONVERSATION_STATUS', () => {
    it('evaluates conversation status equals and not_equals', async () => {
      const rOpen = await conditionEngine.evaluate(
        {
          type: 'CONVERSATION_STATUS',
          configuration: { status: 'OPEN', operator: 'equals' },
        },
        {
          ...baseContext,
          conversation: { id: CONV_ID, status: 'OPEN', workspace_id: WS_ID, project_id: PROJ_ID },
        }
      );
      expect(rOpen.matched).toBe(true);
      expect(rOpen.branch).toBe('YES');

      const rNotResolved = await conditionEngine.evaluate(
        {
          type: 'CONVERSATION_STATUS',
          configuration: { status: 'RESOLVED', operator: 'not_equals' },
        },
        {
          ...baseContext,
          conversation: { id: CONV_ID, status: 'OPEN', workspace_id: WS_ID, project_id: PROJ_ID },
        }
      );
      expect(rNotResolved.matched).toBe(true);
      expect(rNotResolved.branch).toBe('YES');
    });

    it('returns MISSING_CONVERSATION when conversation cannot be resolved', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      const result = await conditionEngine.evaluate(
        {
          type: 'CONVERSATION_STATUS',
          configuration: { status: 'OPEN' },
        },
        {
          ...baseContext,
          conversation: null,
          conversationId: 'conv_missing',
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('MISSING_CONVERSATION');
    });
  });

  // ============================================================================
  // 10. CONVERSATION_ASSIGNEE Evaluator
  // ============================================================================
  describe('CONVERSATION_ASSIGNEE', () => {
    it('evaluates IS_ASSIGNED and IS_UNASSIGNED states', async () => {
      const rAssigned = await conditionEngine.evaluate(
        {
          type: 'CONVERSATION_ASSIGNEE',
          configuration: { assigneeState: 'IS_ASSIGNED' },
        },
        {
          ...baseContext,
          conversation: { id: CONV_ID, assigned_user_id: 'usr_1', workspace_id: WS_ID, project_id: PROJ_ID },
        }
      );
      expect(rAssigned.matched).toBe(true);
      expect(rAssigned.branch).toBe('YES');

      const rUnassigned = await conditionEngine.evaluate(
        {
          type: 'CONVERSATION_ASSIGNEE',
          configuration: { assigneeState: 'IS_UNASSIGNED' },
        },
        {
          ...baseContext,
          conversation: { id: CONV_ID, assigned_user_id: null, workspace_id: WS_ID, project_id: PROJ_ID },
        }
      );
      expect(rUnassigned.matched).toBe(true);
      expect(rUnassigned.branch).toBe('YES');
    });

    it('evaluates SPECIFIC_USER match', async () => {
      mockSql.mockResolvedValueOnce({ rows: [{ user_id: 'usr_1' }] }); // project member check

      const result = await conditionEngine.evaluate(
        {
          type: 'CONVERSATION_ASSIGNEE',
          configuration: { userId: 'usr_1', operator: 'equals' },
        },
        {
          ...baseContext,
          conversation: { id: CONV_ID, assigned_user_id: 'usr_1', workspace_id: WS_ID, project_id: PROJ_ID },
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
    });
  });

  // ============================================================================
  // 11. AI_INTENT Evaluator
  // ============================================================================
  describe('AI_INTENT', () => {
    it('evaluates pre-computed aiIntent in context when confidence meets threshold', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'AI_INTENT',
          configuration: {
            intent: 'pricing_question',
            minimumConfidence: 0.8,
          },
        },
        {
          ...baseContext,
          aiIntent: {
            intent: 'pricing_question',
            confidence: 0.92,
          },
        }
      );

      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
      expect(result.evaluatedValue?.confidence).toBe(0.92);
    });

    it('evaluates NO when confidence is below configured threshold', async () => {
      const result = await conditionEngine.evaluate(
        {
          type: 'AI_INTENT',
          configuration: {
            intent: 'pricing_question',
            minimumConfidence: 0.85,
          },
        },
        {
          ...baseContext,
          aiIntent: {
            intent: 'pricing_question',
            confidence: 0.7,
          },
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
    });

    it('calls IntentDetectionService dynamically when aiIntent is missing in context', async () => {
      mockAiProvider.generateStructuredOutput.mockResolvedValueOnce({
        data: {
          intent: 'pricing_question',
          confidence: 0.95,
        },
        raw: {},
      });

      const result = await conditionEngine.evaluate(
        {
          type: 'AI_INTENT',
          configuration: {
            intent: 'pricing_question',
            minimumConfidence: 0.8,
          },
        },
        {
          ...baseContext,
          message: { body: 'How much does the enterprise plan cost?' },
        }
      );

      expect(mockAiProvider.generateStructuredOutput).toHaveBeenCalledTimes(1);
      expect(result.matched).toBe(true);
      expect(result.branch).toBe('YES');
    });

    it('handles AI provider failure gracefully with AI_PROVIDER_ERROR', async () => {
      mockAiProvider.generateStructuredOutput.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const result = await conditionEngine.evaluate(
        {
          type: 'AI_INTENT',
          configuration: {
            intent: 'pricing_question',
          },
        },
        {
          ...baseContext,
          message: { body: 'How much does it cost?' },
        }
      );

      expect(result.matched).toBe(false);
      expect(result.branch).toBe('NO');
      expect(result.errorCode).toBe('AI_PROVIDER_ERROR');
    });
  });

  // ============================================================================
  // 12. Preview & Metrics
  // ============================================================================
  describe('Preview & Observability Metrics', () => {
    it('supports builder preview method', async () => {
      const previewRes = await conditionEngine.preview(
        'MESSAGE_CONTAINS',
        { value: 'course' },
        { ...baseContext, message: { body: 'I want this course' } }
      );

      expect(previewRes.matched).toBe(true);
      expect(previewRes.branch).toBe('YES');
    });

    it('tracks condition evaluation metrics accurately', async () => {
      conditionObservability.resetMetrics();

      await conditionEngine.evaluate(
        { type: 'MESSAGE_CONTAINS', configuration: { value: 'yes' } },
        { ...baseContext, message: { body: 'yes please' } }
      );

      await conditionEngine.evaluate(
        { type: 'MESSAGE_CONTAINS', configuration: { value: 'yes' } },
        { ...baseContext, message: { body: 'no thanks' } }
      );

      const metrics = conditionObservability.getMetrics();
      expect(metrics.evaluations).toBe(2);
      expect(metrics.matches).toBe(1);
      expect(metrics.nonMatches).toBe(1);
      expect(metrics.errors).toBe(0);
    });
  });

  // ============================================================================
  // 13. Integration Flow: Trigger -> Condition -> Branch
  // ============================================================================
  describe('Integration: Phase 10 Trigger to Phase 11 Condition Branching', () => {
    it('evaluates condition from a simulated triggered execution context', async () => {
      // 1. Context created by Phase 10 Trigger Engine
      const triggerExecutionContext: ConditionExecutionContext = {
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        automationId: AUTO_ID,
        automationVersionId: VER_ID,
        executionId: 'exec_abc123',
        triggerType: 'WHATSAPP_INCOMING_MESSAGE',
        triggerEventId: 'evt_msg_1',
        message: {
          id: 'msg_1',
          body: 'I want to enroll in the digital marketing course',
        },
      };

      // 2. Condition node A: MESSAGE_CONTAINS "course"
      const conditionNode = {
        id: 'node_condition_1',
        nodeKey: 'condition_1',
        type: 'condition',
        definitionType: 'MESSAGE_CONTAINS',
        configuration: {
          operator: 'contains',
          value: 'course',
        },
      };

      // 3. Condition Engine evaluates condition
      const evalResult = await conditionEngine.evaluate(conditionNode, triggerExecutionContext);

      expect(evalResult.matched).toBe(true);
      expect(evalResult.branch).toBe('YES');

      // The future AutomationEngine (Phase 12) will select the edge where condition_key === evalResult.branch ('YES')
    });
  });
});
