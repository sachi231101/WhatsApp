import { AutomationNodeRecord } from '../../types';
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types';
import { ActionExecutorRegistry } from './actionExecutorRegistry';
import { ActionIdempotencyService } from '../actionIdempotencyService';

export class ActionExecutor implements NodeExecutor {
  readonly category = 'ACTION';

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { workspaceId, projectId, executionId } = context;

    // 1. Action Idempotency Check (prevent duplicate execution on worker retry)
    const existingRecord = await ActionIdempotencyService.get(
      workspaceId,
      projectId,
      executionId,
      node.id
    );

    if (existingRecord && existingRecord.status === 'COMPLETED') {
      return {
        status: 'COMPLETED',
        output: {
          ...(existingRecord.output || {}),
          deduplicated: true,
        },
        sideEffectId: existingRecord.sideEffectId || undefined,
      };
    }

    // 2. Resolve specialized Action Node Executor
    const actionExecutor = ActionExecutorRegistry.resolve(node.type);

    if (!actionExecutor) {
      // Reserved for later phases (AI in Phase 16; Wait in Phase 17)
      return {
        status: 'FAILED',
        errorCode: 'NODE_NOT_IMPLEMENTED',
        errorMessage: `Action node "${node.label}" (type: "${node.type}") runtime execution is coming in a subsequent phase.`,
        output: {
          nodeType: node.type,
          nodeKey: node.nodeKey,
          isImplemented: false,
        },
      };
    }

    // 3. Execute the Action
    const result = await actionExecutor.execute(node, context);

    // 4. Record Action Idempotency if successful
    if (result.status === 'COMPLETED') {
      await ActionIdempotencyService.record({
        workspaceId,
        projectId,
        executionId,
        nodeId: node.id,
        actionType: node.type,
        status: 'COMPLETED',
        sideEffectId: result.sideEffectId || null,
        output: result.output || {},
      });
    }

    return result;
  }
}
