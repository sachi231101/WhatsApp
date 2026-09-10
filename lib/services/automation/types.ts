// ============================================================================
// Automation Domain Types, Enums & DTOs (Phase 1)
// ============================================================================

export type AutomationStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type AutomationVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AutomationExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AutomationExecutionStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type AutomationConditionKey = 'YES' | 'NO' | 'TRUE' | 'FALSE' | string;

// Domain Entities
export interface AutomationRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  status: AutomationStatus;
  currentVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface AutomationVersionRecord {
  id: string;
  automationId: string;
  versionNumber: number;
  status: AutomationVersionStatus;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface AutomationNodeRecord {
  id: string;
  automationVersionId: string;
  nodeKey: string;
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationEdgeRecord {
  id: string;
  automationVersionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  conditionKey: AutomationConditionKey | null;
  createdAt: string;
}

export interface AutomationExecutionRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  automationId: string;
  automationVersionId: string;
  triggerType: string;
  triggerEventId: string | null;
  idempotencyKey: string | null;
  conversationId: string | null;
  contactId: string | null;
  status: AutomationExecutionStatus;
  currentNodeId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecutionStepRecord {
  id: string;
  executionId: string;
  nodeId: string;
  status: AutomationExecutionStepStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// Input DTOs
export interface CreateAutomationInput {
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string | null;
  status?: AutomationStatus;
  createdBy?: string | null;
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string | null;
  status?: AutomationStatus;
  currentVersionId?: string | null;
}

export interface CreateVersionInput {
  createdBy?: string | null;
  cloneFromVersionId?: string;
}

export interface CreateNodeInput {
  nodeKey: string;
  type: string;
  label: string;
  positionX?: number;
  positionY?: number;
  configuration?: Record<string, any>;
}

export interface UpdateNodeInput {
  label?: string;
  type?: string;
  positionX?: number;
  positionY?: number;
  configuration?: Record<string, any>;
}

export interface CreateEdgeInput {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  conditionKey?: AutomationConditionKey | null;
}

export interface CreateExecutionInput {
  workspaceId: string;
  projectId: string;
  automationId: string;
  automationVersionId: string;
  triggerType: string;
  triggerEventId?: string | null;
  idempotencyKey?: string | null;
  conversationId?: string | null;
  contactId?: string | null;
  currentNodeId?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateExecutionStepInput {
  executionId: string;
  nodeId: string;
  status?: AutomationExecutionStepStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

// Domain Errors
export class AutomationNotFoundError extends Error {
  statusCode = 404;
  code = 'AUTOMATION_NOT_FOUND';
  constructor(message = 'Automation workflow not found.') {
    super(message);
    this.name = 'AutomationNotFoundError';
  }
}

export class AutomationVersionNotFoundError extends Error {
  statusCode = 404;
  code = 'AUTOMATION_VERSION_NOT_FOUND';
  constructor(message = 'Automation version not found.') {
    super(message);
    this.name = 'AutomationVersionNotFoundError';
  }
}

export class AutomationVersionImmutableError extends Error {
  statusCode = 400;
  code = 'AUTOMATION_VERSION_IMMUTABLE';
  constructor(message = 'Published or archived automation versions cannot be modified.') {
    super(message);
    this.name = 'AutomationVersionImmutableError';
  }
}

export class AutomationTenantViolationError extends Error {
  statusCode = 403;
  code = 'AUTOMATION_TENANT_VIOLATION';
  constructor(message = 'Access denied: Automation does not belong to specified workspace and project.') {
    super(message);
    this.name = 'AutomationTenantViolationError';
  }
}

export class AutomationNodeDuplicateKeyError extends Error {
  statusCode = 409;
  code = 'AUTOMATION_NODE_DUPLICATE_KEY';
  constructor(key: string) {
    super(`Node key "${key}" already exists in this automation version.`);
    this.name = 'AutomationNodeDuplicateKeyError';
  }
}

export class AutomationEdgeInvalidNodeError extends Error {
  statusCode = 400;
  code = 'AUTOMATION_EDGE_INVALID_NODE';
  constructor(message = 'Source or target node does not belong to this automation version.') {
    super(message);
    this.name = 'AutomationEdgeInvalidNodeError';
  }
}

export class AutomationIdempotencyConflictError extends Error {
  statusCode = 409;
  code = 'AUTOMATION_IDEMPOTENCY_CONFLICT';
  constructor(idempotencyKey: string) {
    super(`An execution with idempotency key "${idempotencyKey}" already exists for this tenant.`);
    this.name = 'AutomationIdempotencyConflictError';
  }
}

export class AutomationDuplicateNameError extends Error {
  statusCode = 409;
  code = 'AUTOMATION_DUPLICATE_NAME';
  constructor(message = 'An automation with this name already exists in this project.') {
    super(message);
    this.name = 'AutomationDuplicateNameError';
  }
}

