import { AutomationNodeRecord } from '../../types';
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types';

export class TerminalExecutor implements NodeExecutor {
  readonly category = 'TERMINAL';

  async execute(
    node: AutomationNodeRecord,
    _context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    return {
      status: 'COMPLETED',
      output: {
        terminatedAt: new Date().toISOString(),
        nodeKey: node.nodeKey,
        nodeType: node.type,
      },
    };
  }
}
