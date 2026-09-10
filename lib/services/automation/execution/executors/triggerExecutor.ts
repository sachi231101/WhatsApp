import { AutomationNodeRecord } from '../../types';
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types';

export class TriggerExecutor implements NodeExecutor {
  readonly category = 'TRIGGER';

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    // The trigger event has already been matched by Phase 10 Trigger Engine.
    // Record step completion with trigger summary and allow traversal to continue.
    return {
      status: 'COMPLETED',
      output: {
        triggerType: context.triggerType,
        triggerEventId: context.triggerEventId,
        nodeKey: node.nodeKey,
        nodeType: node.type,
      },
    };
  }
}
