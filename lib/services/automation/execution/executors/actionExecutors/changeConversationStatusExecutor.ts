import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { InboxService } from '@/lib/services/inbox/inboxService';

const VALID_STATUSES = new Set(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']);

export class ChangeConversationStatusExecutor implements ActionNodeExecutor {
  private inboxService: InboxService;

  constructor(inboxService?: InboxService) {
    this.inboxService = inboxService || new InboxService();
  }

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.configuration || {};
    const { workspaceId, projectId, conversationId } = context;

    if (!conversationId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot change status: No conversation associated with this workflow execution.',
      };
    }

    const rawStatus = config.status || config.newStatus;
    if (!rawStatus) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Target conversation status is required.',
      };
    }

    const targetStatus = String(rawStatus).toUpperCase().trim();
    if (!VALID_STATUSES.has(targetStatus)) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_STATUS',
        errorMessage: `Invalid conversation status "${rawStatus}". Allowed values: OPEN, PENDING, RESOLVED, CLOSED.`,
      };
    }

    try {
      // 1. Verify Conversation belongs to workspace & project
      const conv = await this.inboxService.getConversationDetails(workspaceId, projectId, conversationId);
      if (!conv) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: 'Conversation not found or does not belong to this project.',
        };
      }

      const previousStatus = (conv.status || '').toUpperCase();

      // 2. Check Natural Idempotency: conversation already in requested status
      if (previousStatus === targetStatus) {
        return {
          status: 'COMPLETED',
          output: {
            action: 'CHANGE_CONVERSATION_STATUS',
            previousStatus,
            status: targetStatus,
            alreadyInStatus: true,
          },
          sideEffectId: `status_${conversationId}_${targetStatus.toLowerCase()}`,
        };
      }

      // 3. Update Conversation Status via InboxService
      await this.inboxService.updateConversationStatus({
        workspaceId,
        projectId,
        conversationId,
        status: targetStatus.toLowerCase() as any,
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'CHANGE_CONVERSATION_STATUS',
          previousStatus,
          status: targetStatus,
          alreadyInStatus: false,
        },
        sideEffectId: `status_${conversationId}_${targetStatus.toLowerCase()}`,
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorCode: 'ACTION_ERROR',
        errorMessage: err?.message || 'Failed to update conversation status.',
      };
    }
  }
}
