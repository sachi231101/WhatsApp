import { AutomationNodeRecord } from '../../types';
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types';
import { conditionEngine, ConditionExecutionContext } from '../../conditions';

export class ConditionExecutor implements NodeExecutor {
  readonly category = 'CONDITION';

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const conditionContext: ConditionExecutionContext = {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      automationId: context.automationId,
      automationVersionId: context.automationVersionId,
      executionId: context.executionId,
      contactId: context.contactId,
      conversationId: context.conversationId,
      messageId: context.messageId,
      triggerType: context.triggerType,
      triggerEventId: context.triggerEventId,
      variables: context.variables,
    };

    const evalResult = await conditionEngine.evaluate(node, conditionContext);

    // Fatal configuration or tenant violation errors
    if (evalResult.errorCode && ['TENANT_VIOLATION', 'UNSUPPORTED_NODE_TYPE'].includes(evalResult.errorCode)) {
      return {
        status: 'FAILED',
        branch: evalResult.branch,
        output: evalResult,
        errorCode: evalResult.errorCode,
        errorMessage: evalResult.reason,
      };
    }

    return {
      status: 'COMPLETED',
      branch: evalResult.branch,
      output: {
        matched: evalResult.matched,
        branch: evalResult.branch,
        evaluatedValue: evalResult.evaluatedValue,
        operator: evalResult.operator,
        reason: evalResult.reason,
        errorCode: evalResult.errorCode,
      },
    };
  }
}
