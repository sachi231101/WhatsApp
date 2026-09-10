import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { InboxService } from '@/lib/services/inbox/inboxService';

const inboxService = new InboxService();

export class ConversationStatusEvaluator implements ConditionEvaluator {
  readonly type = 'CONVERSATION_STATUS';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const targetStatus = String(configuration.status || configuration.targetStatus || '').toUpperCase().trim();

    if (!targetStatus) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Target conversation status is required',
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    const conversationId = context.conversationId || context.conversation?.id;
    if (!conversationId) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Conversation ID is not available in execution context',
        errorCode: 'MISSING_CONVERSATION',
      };
    }

    let actualStatus: string | null = null;

    if (context.conversation && context.conversation.status) {
      if (
        (context.conversation.workspace_id && context.conversation.workspace_id !== context.workspaceId) ||
        (context.conversation.workspaceId && context.conversation.workspaceId !== context.workspaceId) ||
        (context.conversation.project_id && context.conversation.project_id !== context.projectId) ||
        (context.conversation.projectId && context.conversation.projectId !== context.projectId)
      ) {
        return {
          matched: false,
          branch: 'NO',
          reason: 'Conversation does not belong to the execution project/workspace',
          errorCode: 'TENANT_VIOLATION',
        };
      }
      actualStatus = String(context.conversation.status).toUpperCase().trim();
    } else {
      try {
        const conv = await inboxService.getConversationDetails(
          context.workspaceId,
          context.projectId,
          conversationId
        );
        if (!conv) {
          return {
            matched: false,
            branch: 'NO',
            reason: 'Conversation record was not found in project',
            errorCode: 'MISSING_CONVERSATION',
          };
        }
        actualStatus = String(conv.status).toUpperCase().trim();
      } catch (err: any) {
        return {
          matched: false,
          branch: 'NO',
          reason: `Failed to load conversation: ${err.message || String(err)}`,
          errorCode: 'DATA_ACCESS_ERROR',
        };
      }
    }

    const operator = String(configuration.operator || 'equals').toLowerCase().trim();
    const isEquals = actualStatus === targetStatus;
    const matched = operator === 'not_equals' ? !isEquals : isEquals;

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: actualStatus,
      operator,
      metadata: {
        targetStatus,
        actualStatus,
      },
    };
  }
}
