// ============================================================================
// Automation Request Validation Helpers
// ============================================================================

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(id: string | null | undefined, fieldName = 'ID'): string {
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid UUID.`);
  }
  return id.trim();
}

export function validateCreateAutomation(body: any): {
  name: string;
  description: string | null;
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  const name = body.name;
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('Automation name is required.');
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    throw new ValidationError('Automation name must be at least 2 characters.');
  }
  if (trimmedName.length > 255) {
    throw new ValidationError('Automation name cannot exceed 255 characters.');
  }

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      throw new ValidationError('Description must be a string.');
    }
    const trimmedDesc = body.description.trim();
    if (trimmedDesc.length > 2000) {
      throw new ValidationError('Description cannot exceed 2000 characters.');
    }
    description = trimmedDesc || null;
  }

  return { name: trimmedName, description };
}

export function validateUpdateAutomation(body: any): {
  name?: string;
  description?: string | null;
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  // Reject direct modification of protected system fields
  const protectedFields = ['workspace_id', 'workspaceId', 'project_id', 'projectId', 'created_by', 'createdBy', 'current_version_id', 'currentVersionId', 'id', 'created_at', 'createdAt', 'updated_at', 'updatedAt'];
  for (const field of protectedFields) {
    if (field in body) {
      throw new ValidationError(`Field '${field}' cannot be modified directly.`);
    }
  }

  const updates: { name?: string; description?: string | null } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new ValidationError('Automation name cannot be empty.');
    }
    const trimmedName = body.name.trim();
    if (trimmedName.length < 2) {
      throw new ValidationError('Automation name must be at least 2 characters.');
    }
    if (trimmedName.length > 255) {
      throw new ValidationError('Automation name cannot exceed 255 characters.');
    }
    updates.name = trimmedName;
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      updates.description = null;
    } else if (typeof body.description === 'string') {
      const trimmedDesc = body.description.trim();
      if (trimmedDesc.length > 2000) {
        throw new ValidationError('Description cannot exceed 2000 characters.');
      }
      updates.description = trimmedDesc || null;
    } else {
      throw new ValidationError('Description must be a string or null.');
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('At least one editable field (name, description) must be provided.');
  }

  return updates;
}

export function validateListQuery(searchParams: URLSearchParams): {
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'ALL';
  search?: string;
  limit: number;
  offset: number;
} {
  const statusParam = searchParams.get('status');
  let status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'ALL' | undefined;
  if (statusParam) {
    const upper = statusParam.toUpperCase();
    if (['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL'].includes(upper)) {
      status = upper as any;
    } else {
      throw new ValidationError(`Invalid status filter: '${statusParam}'. Allowed: DRAFT, ACTIVE, PAUSED, ARCHIVED, ALL.`);
    }
  }

  const searchParam = searchParams.get('search');
  let search: string | undefined;
  if (searchParam) {
    const trimmed = searchParam.trim();
    if (trimmed.length > 100) {
      throw new ValidationError('Search query cannot exceed 100 characters.');
    }
    search = trimmed || undefined;
  }

  const limitParam = searchParams.get('limit');
  let limit = 50;
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      throw new ValidationError('Limit must be a number between 1 and 100.');
    }
    limit = parsed;
  }

  const offsetParam = searchParams.get('offset');
  let offset = 0;
  if (offsetParam !== null) {
    const parsed = Number(offsetParam);
    if (isNaN(parsed) || parsed < 0) {
      throw new ValidationError('Offset must be a non-negative number.');
    }
    offset = parsed;
  }

  return { status, search, limit, offset };
}

export function validateUpdateDraftVersion(body: any): {
  nodes?: Array<{
    id?: string;
    nodeKey: string;
    type: string;
    label: string;
    positionX?: number;
    positionY?: number;
    configuration?: Record<string, any>;
  }>;
  edges?: Array<{
    id?: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    conditionKey?: string | null;
  }>;
  metadata?: Record<string, any>;
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object.');
  }

  const result: any = {};

  if (body.nodes !== undefined) {
    if (!Array.isArray(body.nodes)) {
      throw new ValidationError('Nodes must be an array.');
    }

    const seenKeys = new Set<string>();
    result.nodes = body.nodes.map((node: any, idx: number) => {
      if (!node || typeof node !== 'object') {
        throw new ValidationError(`Node at index ${idx} must be an object.`);
      }
      if (!node.nodeKey || typeof node.nodeKey !== 'string' || !node.nodeKey.trim()) {
        throw new ValidationError(`Node at index ${idx} requires a non-empty nodeKey.`);
      }
      const key = node.nodeKey.trim();
      if (seenKeys.has(key)) {
        throw new ValidationError(`Duplicate nodeKey '${key}' found at index ${idx}. Node keys must be unique.`);
      }
      seenKeys.add(key);

      if (!node.type || typeof node.type !== 'string' || !node.type.trim()) {
        throw new ValidationError(`Node '${key}' requires a non-empty type.`);
      }
      if (!node.label || typeof node.label !== 'string' || !node.label.trim()) {
        throw new ValidationError(`Node '${key}' requires a non-empty label.`);
      }

      if (node.configuration !== undefined && (typeof node.configuration !== 'object' || node.configuration === null || Array.isArray(node.configuration))) {
        throw new ValidationError(`Node '${key}' configuration must be a valid JSON object.`);
      }

      return {
        id: node.id ? String(node.id) : undefined,
        nodeKey: key,
        type: node.type.trim(),
        label: node.label.trim(),
        positionX: typeof node.positionX === 'number' ? node.positionX : 0,
        positionY: typeof node.positionY === 'number' ? node.positionY : 0,
        configuration: node.configuration || {},
      };
    });
  }

  if (body.edges !== undefined) {
    if (!Array.isArray(body.edges)) {
      throw new ValidationError('Edges must be an array.');
    }

    result.edges = body.edges.map((edge: any, idx: number) => {
      if (!edge || typeof edge !== 'object') {
        throw new ValidationError(`Edge at index ${idx} must be an object.`);
      }
      if (!edge.sourceNodeId || typeof edge.sourceNodeId !== 'string') {
        throw new ValidationError(`Edge at index ${idx} requires a valid sourceNodeId.`);
      }
      if (!edge.targetNodeId || typeof edge.targetNodeId !== 'string') {
        throw new ValidationError(`Edge at index ${idx} requires a valid targetNodeId.`);
      }

      return {
        id: edge.id ? String(edge.id) : undefined,
        sourceNodeId: edge.sourceNodeId.trim(),
        targetNodeId: edge.targetNodeId.trim(),
        sourceHandle: edge.sourceHandle ? String(edge.sourceHandle).trim() : null,
        targetHandle: edge.targetHandle ? String(edge.targetHandle).trim() : null,
        conditionKey: edge.conditionKey ? String(edge.conditionKey).trim() : null,
      };
    });
  }

  if (body.metadata !== undefined) {
    if (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata)) {
      throw new ValidationError('Metadata must be a JSON object.');
    }
    result.metadata = body.metadata;
  }

  return result;
}
