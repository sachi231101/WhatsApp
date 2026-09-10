import type { Node, Edge, Connection } from '@xyflow/react';

// ── Node & Edge Data Types ───────────────────────────────────────────────────

export type CanvasCategory = 'Triggers' | 'Conditions' | 'Actions' | 'AI' | 'Utilities';

export interface WorkflowNodeData {
  nodeKey: string;
  label: string;
  nodeType: string; // e.g., 'trigger', 'condition', 'action', 'ai', 'utility'
  category: CanvasCategory;
  config: Record<string, any>;
  iconName?: string;
  description?: string;
  isImplemented?: boolean;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  [key: string]: any;
}

export type WorkflowNode = Node<WorkflowNodeData>;

export interface WorkflowEdgeData {
  conditionKey?: string | null; // 'YES' | 'NO' | null
  [key: string]: any;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

// ── Database Schema Types (as returned by API) ──────────────────────────────

export interface DbAutomationNode {
  id: string;
  nodeKey: string;
  nodeType?: string;
  type?: string;
  label: string;
  config?: Record<string, any>;
  configuration?: Record<string, any>;
  positionX: number;
  positionY: number;
}

export interface DbAutomationEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  conditionKey?: string | null;
  conditionBranch?: string | null;
}

// ── Normalized Save Payload Type ────────────────────────────────────────────

export interface NormalizedWorkflowPayload {
  nodes: Array<{
    id?: string;
    nodeKey: string;
    type: string;
    label: string;
    positionX: number;
    positionY: number;
    configuration: Record<string, any>;
  }>;
  edges: Array<{
    id?: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    conditionKey?: string | null;
  }>;
}

// ── Converters ──────────────────────────────────────────────────────────────

/**
 * Maps database nodes to React Flow nodes.
 */
export function dbToFlowNodes(
  dbNodes: DbAutomationNode[],
  handlers?: {
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
  }
): WorkflowNode[] {
  return (dbNodes || []).map((n) => {
    const rawType = (n.type || n.nodeType || 'action').toLowerCase();
    const resolvedType = ['trigger', 'condition', 'action', 'ai', 'utility'].includes(rawType)
      ? rawType
      : 'action';

    const categoryMap: Record<string, CanvasCategory> = {
      trigger: 'Triggers',
      condition: 'Conditions',
      action: 'Actions',
      ai: 'AI',
      utility: 'Utilities',
    };

    return {
      id: n.id,
      type: resolvedType,
      position: {
        x: typeof n.positionX === 'number' ? n.positionX : 100,
        y: typeof n.positionY === 'number' ? n.positionY : 100,
      },
      data: {
        nodeKey: n.nodeKey,
        label: n.label || 'Workflow Node',
        nodeType: resolvedType,
        category: categoryMap[resolvedType] || 'Actions',
        config: n.configuration || n.config || {},
        isImplemented: true,
        onDuplicate: handlers?.onDuplicate,
        onDelete: handlers?.onDelete,
      },
    };
  });
}

/**
 * Maps database edges to React Flow edges.
 */
export function dbToFlowEdges(dbEdges: DbAutomationEdge[]): WorkflowEdge[] {
  return (dbEdges || []).map((e) => {
    const conditionKey = e.conditionKey || e.conditionBranch || null;
    return {
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      sourceHandle: e.sourceHandle || (conditionKey ? conditionKey.toLowerCase() : null),
      targetHandle: e.targetHandle || null,
      type: 'branchingEdge',
      data: {
        conditionKey: conditionKey,
      },
    };
  });
}

/**
 * Serializes current React Flow canvas state into the normalized payload
 * expected by draft version save APIs.
 */
export function serializeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): NormalizedWorkflowPayload {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      nodeKey: n.data.nodeKey,
      type: n.data.nodeType || n.type || 'action',
      label: n.data.label,
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
      configuration: n.data.config || {},
    })),
    edges: edges.map((e) => {
      // Resolve condition key from edge data or handle name
      let condKey = e.data?.conditionKey || null;
      if (!condKey && e.sourceHandle) {
        if (e.sourceHandle.toLowerCase() === 'yes') condKey = 'YES';
        if (e.sourceHandle.toLowerCase() === 'no') condKey = 'NO';
      }

      return {
        id: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        conditionKey: condKey,
      };
    }),
  };
}

/**
 * Generates a unique node_key ensuring uniqueness across existing nodes.
 */
export function generateUniqueNodeKey(baseType: string, existingNodes: WorkflowNode[]): string {
  const existingKeys = new Set(existingNodes.map((n) => n.data.nodeKey));
  const prefix = baseType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  let counter = 1;
  let candidate = `${prefix}_${counter}`;
  while (existingKeys.has(candidate)) {
    counter += 1;
    candidate = `${prefix}_${counter}`;
  }
  return candidate;
}

/**
 * Safely duplicates a workflow node:
 * - Assigns fresh temporary ID
 * - Generates unique node_key
 * - Deep clones configuration without copying DB primary keys
 * - Positions with a sensible offset
 */
export function duplicateWorkflowNode(
  sourceNode: WorkflowNode,
  allNodes: WorkflowNode[],
  handlers?: {
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
  }
): WorkflowNode {
  const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newKey = generateUniqueNodeKey(sourceNode.data.nodeKey || sourceNode.data.nodeType, allNodes);

  // Deep clone configuration
  const clonedConfig = JSON.parse(JSON.stringify(sourceNode.data.config || {}));

  return {
    ...sourceNode,
    id: newId,
    position: {
      x: sourceNode.position.x + 40,
      y: sourceNode.position.y + 40,
    },
    selected: true,
    data: {
      ...sourceNode.data,
      nodeKey: newKey,
      label: `${sourceNode.data.label} (Copy)`,
      config: clonedConfig,
      onDuplicate: handlers?.onDuplicate,
      onDelete: handlers?.onDelete,
    },
  };
}

/**
 * Validates whether a proposed edge connection is valid.
 * Enforces:
 * - No self-connections (source === target)
 * - Both source and target nodes must exist
 * - Triggers cannot have incoming connections
 * - Duplicate edges (same source, target, and condition handle) are rejected
 */
export function validateConnectionRule(
  connection: Connection,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { isValid: boolean; reason?: string } {
  const { source, target, sourceHandle } = connection;

  if (!source || !target) {
    return { isValid: false, reason: 'Invalid node IDs.' };
  }

  // 1. Prevent self-connection
  if (source === target) {
    return { isValid: false, reason: 'Self-connections are not allowed.' };
  }

  // 2. Verify source & target nodes exist
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode) {
    return { isValid: false, reason: `Source node '${source}' does not exist.` };
  }
  if (!targetNode) {
    return { isValid: false, reason: `Target node '${target}' does not exist.` };
  }

  // 3. Prevent incoming connections to Trigger nodes
  if (targetNode.type === 'trigger' || targetNode.data.nodeType === 'trigger') {
    return { isValid: false, reason: 'Trigger nodes cannot receive incoming connections.' };
  }

  // 4. Prevent duplicate edges
  const isDuplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      (e.sourceHandle || null) === (sourceHandle || null)
  );

  if (isDuplicate) {
    return { isValid: false, reason: 'Duplicate connection already exists.' };
  }

  return { isValid: true };
}
