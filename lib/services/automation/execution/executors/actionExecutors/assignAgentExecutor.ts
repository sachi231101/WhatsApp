import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { InboxService } from '@/lib/services/inbox/inboxService';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';

export class AssignAgentExecutor implements ActionNodeExecutor {
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
        errorMessage: 'Cannot assign agent: No conversation associated with this workflow execution.',
      };
    }

    const isUnassign =
      config.assignmentType === 'UNASSIGN' ||
      config.userId === null ||
      config.agentUserId === null;

    const targetUserId = isUnassign
      ? null
      : (config.userId || config.agentUserId || null);

    if (!isUnassign && !targetUserId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot assign agent: Target "userId" or "agentUserId" is required.',
      };
    }

    try {
      await ensureCoreTables();

      // 1. Verify Conversation belongs to workspace & project
      const conv = await this.inboxService.getConversationDetails(workspaceId, projectId, conversationId);
      if (!conv) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: 'Conversation not found or does not belong to this project.',
        };
      }

      // 2. Check Natural Idempotency: conversation already assigned to this user
      if (conv.assigned_user_id === targetUserId) {
        return {
          status: 'COMPLETED',
          output: {
            action: 'ASSIGN_AGENT',
            assignedTo: targetUserId,
            alreadyAssigned: true,
          },
          sideEffectId: `assign_${conversationId}_${targetUserId || 'none'}`,
        };
      }

      // 3. If target user provided, verify user belongs to this workspace
      if (targetUserId) {
        const { rows: memberRows } = await sql`
          SELECT wm.user_id, u.name
          FROM workspace_members wm
          JOIN users u ON wm.user_id = u.id
          WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${targetUserId} AND wm.status = 'active'
          LIMIT 1
        `;
        if (memberRows.length === 0) {
          return {
            status: 'FAILED',
            errorCode: 'UNAUTHORIZED_RESOURCE',
            errorMessage: `Target agent user "${targetUserId}" does not belong to this workspace or is inactive.`,
          };
        }
      }

      // 4. Perform assignment via InboxService
      await this.inboxService.assignConversation({
        workspaceId,
        projectId,
        conversationId,
        targetUserId,
        assignedByUserId: '00000000-0000-0000-0000-000000000000', // System / Automation
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'ASSIGN_AGENT',
          assignedTo: targetUserId,
          alreadyAssigned: false,
        },
        sideEffectId: `assign_${conversationId}_${targetUserId || 'none'}`,
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorCode: 'ACTION_ERROR',
        errorMessage: err?.message || 'Failed to assign conversation.',
      };
    }
  }
}
