import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { TaskService, taskService } from '@/lib/services/tasks/taskService';
import { VariableResolver } from '@/lib/services/automation/execution/variableResolver';

export class CreateTaskExecutor implements ActionNodeExecutor {
  private taskService: TaskService;

  constructor(service?: TaskService) {
    this.taskService = service || taskService;
  }

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.configuration || {};
    const { workspaceId, projectId, contactId, conversationId, executionId } = context;

    const rawTitle = config.title ?? config.taskTitle;
    if (!rawTitle || !String(rawTitle).trim()) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Task title is required.',
      };
    }

    // 1. Resolve Dynamic Variables
    const resolvedTitle = VariableResolver.resolveString(String(rawTitle), context).trim();
    if (!resolvedTitle) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Resolved task title cannot be empty.',
      };
    }

    const rawDescription = config.description ? String(config.description) : null;
    const resolvedDescription = rawDescription
      ? VariableResolver.resolveString(rawDescription, context).trim()
      : null;

    // 2. Compute Due Date
    let dueDate: string | null = null;
    if (config.dueDate) {
      dueDate = VariableResolver.resolveString(String(config.dueDate), context);
    } else if (config.dueInHours && !isNaN(Number(config.dueInHours))) {
      const hours = Number(config.dueInHours);
      dueDate = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }

    // 3. Resolve Assignee
    const assigneeUserId = config.assigneeUserId ?? config.assignee ?? null;

    // 4. Stable Idempotency Key for worker retry deduplication
    const idempotencyKey = `task:${executionId}:${node.id}`;

    try {
      const { task, deduplicated } = await this.taskService.createTask({
        workspaceId,
        projectId,
        contactId: contactId || null,
        conversationId: conversationId || null,
        title: resolvedTitle,
        description: resolvedDescription,
        assigneeUserId: assigneeUserId || null,
        priority: config.priority || 'medium',
        dueDate,
        source: 'AUTOMATION',
        idempotencyKey,
        metadata: {
          executionId,
          nodeId: node.id,
          automationId: context.automationId,
        },
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'CREATE_TASK',
          taskId: task.id,
          title: task.title,
          assigneeUserId: task.assigneeUserId,
          deduplicated,
        },
        sideEffectId: task.id,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Assignee user does not belong')) {
        return {
          status: 'FAILED',
          errorCode: 'UNAUTHORIZED_RESOURCE',
          errorMessage: msg,
        };
      }
      if (msg.includes('not found') || msg.includes('does not belong')) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: msg,
        };
      }
      return {
        status: 'FAILED',
        errorCode: 'ACTION_ERROR',
        errorMessage: msg,
      };
    }
  }
}
