import { ContactRecord } from '@/lib/services/contacts/contactService';

// ============================================================================
// Condition Engine Types, Interfaces & Error Codes
// ============================================================================

export type ConditionBranch = 'YES' | 'NO';

export interface ConditionEvaluationResult {
  matched: boolean;
  branch: ConditionBranch;
  evaluatedValue?: any;
  operator?: string;
  reason?: string;
  metadata?: Record<string, any>;
  errorCode?: ConditionErrorCode | string;
}

export type ConditionErrorCode =
  | 'INVALID_CONFIGURATION'
  | 'INVALID_OPERATOR'
  | 'MISSING_FIELD'
  | 'MISSING_TAG'
  | 'MISSING_CONTACT'
  | 'MISSING_CONVERSATION'
  | 'MISSING_MESSAGE'
  | 'INVALID_TIMEZONE'
  | 'INVALID_DATE'
  | 'INVALID_RANGE'
  | 'AI_PROVIDER_ERROR'
  | 'DATA_ACCESS_ERROR'
  | 'TENANT_VIOLATION'
  | 'UNSUPPORTED_NODE_TYPE';

export interface ConditionExecutionContext {
  workspaceId: string;
  projectId: string;
  automationId: string;
  automationVersionId: string;
  executionId?: string;

  contactId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;

  triggerType?: string | null;
  triggerEventId?: string | null;

  // Cached entities to avoid duplicate queries within the same execution step
  contact?: ContactRecord | null;
  conversation?: any | null;
  message?: any | null;

  occurredAt?: string;
  variables?: Record<string, any>;

  // Optional cached custom field values
  customFieldValues?: Array<{
    definitionId?: string;
    name?: string;
    key?: string;
    type?: string;
    value: any;
  }> | null;

  // Optional pre-computed AI classification result
  aiIntent?: {
    intent: string;
    confidence: number;
  } | null;
}

export interface ConditionEvaluator {
  readonly type: string;
  evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult>;
}
