import { AutomationNodeRecord, AutomationEdgeRecord } from '../types';

// ============================================================================
// Execution Engine Types, Interfaces & Error Codes
// ============================================================================

export type ExecutionErrorCode =
  | 'INVALID_EXECUTION'
  | 'WORKFLOW_NOT_FOUND'
  | 'VERSION_NOT_FOUND'
  | 'VERSION_NOT_PUBLISHED'
  | 'AUTOMATION_PAUSED'
  | 'AUTOMATION_ARCHIVED'
  | 'NODE_NOT_FOUND'
  | 'INVALID_NODE'
  | 'INVALID_EDGE'
  | 'NO_MATCHING_BRANCH'
  | 'INVALID_CONFIGURATION'
  | 'NODE_NOT_IMPLEMENTED'
  | 'CONDITION_ERROR'
  | 'ACTION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'UNAUTHORIZED_RESOURCE'
  | 'INVALID_FIELD'
  | 'INVALID_STATUS'
  | 'DATABASE_TEMPORARY_FAILURE'
  | 'SERVICE_UNAVAILABLE'
  | 'MAX_EXECUTION_STEPS_EXCEEDED'
  | 'EXECUTION_TIMEOUT'
  | 'TENANT_ACCESS_ERROR'
  | 'DATA_ACCESS_ERROR'
  | 'LOCK_ACQUISITION_FAILED'
  | 'WHATSAPP_CONNECTION_UNAVAILABLE'
  | 'RECIPIENT_NOT_FOUND'
  | 'RECIPIENT_PHONE_NOT_FOUND'
  | 'MESSAGE_WINDOW_RESTRICTED'
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_NOT_APPROVED'
  | 'INVALID_TEMPLATE_PARAMETERS'
  | 'INVALID_TEMPLATE_LANGUAGE'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_INVALID'
  | 'MEDIA_NOT_ALLOWED'
  | 'OUTBOUND_QUEUE_ERROR'
  | 'WHATSAPP_CONFIGURATION_ERROR'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_NOT_ACTIVE'
  | 'UNAUTHORIZED_AGENT'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_INVALID_RESPONSE'
  | 'INVALID_OUTPUT_SCHEMA';

export interface ActionNodeExecutor {
  execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

export interface ExecutionContext {
  executionId: string;
  workspaceId: string;
  projectId: string;
  automationId: string;
  automationVersionId: string;

  triggerType: string;
  triggerEventId?: string | null;
  idempotencyKey?: string | null;

  contactId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;

  // Resolved dynamic variables (e.g. {{contact.first_name}})
  variables: Record<string, any>;

  // Track currently processing node
  currentNodeId: string;

  // Traversal bookkeeping
  visitedNodeIds: string[];
  stepCount: number;
  attemptNumber?: number;
  startedAt: number;

  metadata: Record<string, any>;
}

export interface NodeExecutionResult {
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  branch?: 'YES' | 'NO' | string;
  output?: Record<string, any>;
  errorCode?: ExecutionErrorCode | string;
  errorMessage?: string;
  sideEffectId?: string;
}

export interface NodeExecutor {
  readonly category: 'TRIGGER' | 'CONDITION' | 'ACTION' | 'UTILITY' | 'TERMINAL';
  execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

export interface WorkflowGraphData {
  nodes: Map<string, AutomationNodeRecord>;
  edgesBySource: Map<string, AutomationEdgeRecord[]>;
  edgesByTarget: Map<string, AutomationEdgeRecord[]>;
}
