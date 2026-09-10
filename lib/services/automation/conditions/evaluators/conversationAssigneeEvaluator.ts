import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { InboxService } from '@/lib/services/inbox/inboxService';
import { sql } from '@/lib/db';

const inboxService = new InboxService();

export class ConversationAssigneeEvaluator implements ConditionEvaluator {
  readonly type = 'CONVERSATION_ASSIGNEE';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const conversationId = context.conversationId || context.conversation?.id;
    if (!conversationId) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Conversation ID is not available in execution context',
        errorCode: 'MISSING_CONVERSATION',
      };
    }

    let assignedUserId: string | null = null;

    if (context.conversation) {
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
      assignedUserId = context.conversation.assigned_user_id || context.conversation.assignedUserId || null;
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
        assignedUserId = conv.assigned_user_id || null;
      } catch (err: any) {
        return {
          matched: false,
          branch: 'NO',
          reason: `Failed to load conversation: ${err.message || String(err)}`,
          errorCode: 'DATA_ACCESS_ERROR',
        };
      }
    }

    const assigneeState = configuration.assigneeState;
    const targetUserId = configuration.userId ?? configuration.assignedUserId ?? null;
    const operator = String(configuration.operator || 'equals').toLowerCase().trim();

    // If a specific targetUserId is provided, verify it belongs to the current workspace/project
    if (targetUserId) {
      try {
        const { rows: memberRows } = await sql`
          SELECT user_id FROM project_members
          WHERE workspace_id = ${context.workspaceId}
            AND project_id = ${context.projectId}
            AND user_id = ${targetUserId}
          LIMIT 1
        `;
        if (memberRows.length === 0) {
          return {
            matched: false,
            branch: 'NO',
            reason: `Target user "${targetUserId}" does not belong to this project`,
            errorCode: 'TENANT_VIOLATION',
          };
        }
      } catch {
        // Fallback: don't crash if project_members query isn't applicable
      }
    }

    let matched = false;

    if (assigneeState === 'IS_UNASSIGNED') {
      matched = assignedUserId === null;
    } else if (assigneeState === 'IS_ASSIGNED') {
      matched = assignedUserId !== null;
    } else if (targetUserId !== null && targetUserId !== undefined) {
      const isEquals = assignedUserId === targetUserId;
      matched = operator === 'not_equals' ? !isEquals : isEquals;
    } else {
      // If neither state nor userId is provided, check if unassigned comparison is meant
      const isEquals = assignedUserId === null;
      matched = operator === 'not_equals' ? !isEquals : isEquals;
    }

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: assignedUserId,
      operator,
      metadata: {
        assigneeState,
        targetUserId,
        actualAssignedUserId: assignedUserId,
      },
    };
  }
}
