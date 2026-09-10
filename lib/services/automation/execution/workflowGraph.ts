import { sql } from '@/lib/db';
import { AutomationNodeRecord, AutomationEdgeRecord } from '../types';

export class WorkflowGraph {
  readonly versionId: string;
  readonly nodes: Map<string, AutomationNodeRecord> = new Map();
  readonly nodesByKey: Map<string, AutomationNodeRecord> = new Map();
  readonly outgoingEdges: Map<string, AutomationEdgeRecord[]> = new Map();
  readonly incomingEdges: Map<string, AutomationEdgeRecord[]> = new Map();

  constructor(
    versionId: string,
    nodesList: AutomationNodeRecord[],
    edgesList: AutomationEdgeRecord[]
  ) {
    this.versionId = versionId;

    for (const node of nodesList) {
      this.nodes.set(node.id, node);
      this.nodesByKey.set(node.nodeKey, node);
    }

    for (const edge of edgesList) {
      // Outgoing edges
      const outgoing = this.outgoingEdges.get(edge.sourceNodeId) || [];
      outgoing.push(edge);
      this.outgoingEdges.set(edge.sourceNodeId, outgoing);

      // Incoming edges
      const incoming = this.incomingEdges.get(edge.targetNodeId) || [];
      incoming.push(edge);
      this.incomingEdges.set(edge.targetNodeId, incoming);
    }
  }

  /**
   * Loads graph nodes and edges belonging strictly to a single automation version.
   */
  static async load(versionId: string): Promise<WorkflowGraph> {
    const { rows: nodeRows } = await sql`
      SELECT id, automation_version_id, node_key, type, label, position_x, position_y, configuration, created_at, updated_at
      FROM automation_nodes
      WHERE automation_version_id = ${versionId}
      ORDER BY created_at ASC;
    `;

    const { rows: edgeRows } = await sql`
      SELECT id, automation_version_id, source_node_id, target_node_id, source_handle, target_handle, condition_key, created_at
      FROM automation_edges
      WHERE automation_version_id = ${versionId}
      ORDER BY created_at ASC;
    `;

    const nodesList: AutomationNodeRecord[] = (nodeRows || []).map((r: any) => ({
      id: r.id,
      automationVersionId: r.automation_version_id || r.automationVersionId,
      nodeKey: r.node_key || r.nodeKey,
      type: r.type,
      label: r.label,
      positionX: Number(r.position_x ?? r.positionX ?? 0),
      positionY: Number(r.position_y ?? r.positionY ?? 0),
      configuration: typeof r.configuration === 'string' ? JSON.parse(r.configuration) : (r.configuration || {}),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at || new Date().toISOString()),
    }));

    const edgesList: AutomationEdgeRecord[] = (edgeRows || []).map((r: any) => ({
      id: r.id,
      automationVersionId: r.automation_version_id || r.automationVersionId,
      sourceNodeId: r.source_node_id || r.sourceNodeId,
      targetNodeId: r.target_node_id || r.targetNodeId,
      sourceHandle: r.source_handle || r.sourceHandle || null,
      targetHandle: r.target_handle || r.targetHandle || null,
      conditionKey: r.condition_key || r.conditionKey || null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    }));

    return new WorkflowGraph(versionId, nodesList, edgesList);
  }

  getNode(nodeId: string): AutomationNodeRecord | undefined {
    return this.nodes.get(nodeId) || this.nodesByKey.get(nodeId);
  }

  getOutgoingEdges(sourceNodeId: string): AutomationEdgeRecord[] {
    return this.outgoingEdges.get(sourceNodeId) || [];
  }

  getIncomingEdges(targetNodeId: string): AutomationEdgeRecord[] {
    return this.incomingEdges.get(targetNodeId) || [];
  }

  /**
   * Finds the root trigger node of the workflow.
   */
  getTriggerNode(): AutomationNodeRecord | undefined {
    for (const node of this.nodes.values()) {
      const type = (node.type || '').toLowerCase();
      if (
        type.includes('trigger') ||
        type === 'whatsapp_incoming_message' ||
        type === 'keyword_match' ||
        type === 'conversation_created'
      ) {
        return node;
      }
    }

    // Fallback: node with no incoming edges
    for (const node of this.nodes.values()) {
      const incoming = this.incomingEdges.get(node.id) || [];
      if (incoming.length === 0) {
        return node;
      }
    }

    return undefined;
  }

  /**
   * Checks if a node has no outgoing edges and can be considered terminal.
   */
  isTerminalNode(nodeId: string): boolean {
    const outgoing = this.getOutgoingEdges(nodeId);
    return outgoing.length === 0;
  }

  /**
   * Validates graph consistency (all edge references exist, no dangling edges).
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.nodes.size === 0) {
      errors.push('Workflow graph contains no nodes.');
      return { valid: false, errors };
    }

    const trigger = this.getTriggerNode();
    if (!trigger) {
      errors.push('Workflow graph does not contain a valid trigger node.');
    }

    for (const [sourceId, edges] of this.outgoingEdges.entries()) {
      if (!this.nodes.has(sourceId)) {
        errors.push(`Edge references non-existent source node: ${sourceId}`);
      }
      for (const edge of edges) {
        if (!this.nodes.has(edge.targetNodeId)) {
          errors.push(`Edge "${edge.id}" references non-existent target node: ${edge.targetNodeId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
