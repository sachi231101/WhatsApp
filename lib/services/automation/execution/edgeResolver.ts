import { AutomationEdgeRecord, AutomationNodeRecord } from '../types';
import { NodeExecutionResult } from './types';
import { WorkflowGraph } from './workflowGraph';

export class EdgeResolver {
  /**
   * Resolves the next outgoing edge to follow based on node execution output.
   */
  static resolveNextEdge(
    currentNode: AutomationNodeRecord,
    result: NodeExecutionResult,
    graph: WorkflowGraph
  ): AutomationEdgeRecord | null {
    const outgoing = graph.getOutgoingEdges(currentNode.id);

    if (outgoing.length === 0) {
      return null;
    }

    const nodeType = (currentNode.type || '').toLowerCase();
    const isCondition =
      nodeType.includes('condition') ||
      nodeType === 'message_contains' ||
      nodeType === 'contact_tag' ||
      nodeType === 'lead_score' ||
      nodeType === 'custom_field' ||
      nodeType === 'time_condition' ||
      nodeType === 'conversation_status' ||
      nodeType === 'conversation_assignee' ||
      nodeType === 'ai_intent';

    // 1. Branching Condition Resolution
    if (isCondition || result.branch) {
      const targetBranch = String(result.branch || '').toUpperCase().trim();

      // Look for edge with matching conditionKey or sourceHandle
      const matchedEdge = outgoing.find((edge) => {
        const cKey = String(edge.conditionKey || '').toUpperCase().trim();
        const sHandle = String(edge.sourceHandle || '').toUpperCase().trim();

        if (cKey === targetBranch || sHandle === targetBranch) {
          return true;
        }

        // Aliases for YES / NO
        if (targetBranch === 'YES' && (cKey === 'TRUE' || sHandle === 'MATCH' || sHandle === 'YES')) {
          return true;
        }
        if (targetBranch === 'NO' && (cKey === 'FALSE' || sHandle === 'NO_MATCH' || sHandle === 'NO')) {
          return true;
        }

        return false;
      });

      return matchedEdge || null;
    }

    // 2. Linear Node Resolution (single or default outgoing edge)
    return outgoing[0] || null;
  }
}
