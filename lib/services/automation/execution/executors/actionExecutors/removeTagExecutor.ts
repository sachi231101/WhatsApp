import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { TagService } from '@/lib/services/contacts/tagService';

export class RemoveTagExecutor implements ActionNodeExecutor {
  private tagService: TagService;

  constructor(tagService?: TagService) {
    this.tagService = tagService || new TagService();
  }

  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.configuration || {};
    const { workspaceId, projectId, contactId } = context;

    if (!contactId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot remove tag: No contact associated with this workflow execution.',
      };
    }

    // Resolve tagId from config
    const rawTagId =
      config.tagId ||
      (Array.isArray(config.tagIds) ? config.tagIds[0] : null) ||
      (Array.isArray(config.tags) && typeof config.tags[0] === 'string' && config.tags[0].length === 36
        ? config.tags[0]
        : null);

    if (!rawTagId) {
      const rawTagName =
        config.tagName ||
        (Array.isArray(config.tags) && typeof config.tags[0] === 'string' ? config.tags[0] : null);

      if (!rawTagName) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_CONFIGURATION',
          errorMessage: 'Cannot remove tag: "tagId" or "tags" is required in node configuration.',
        };
      }

      try {
        const projectTags = await this.tagService.getProjectTags(workspaceId, projectId);
        const matched = projectTags.find(
          (t) => t.name.toLowerCase() === rawTagName.trim().toLowerCase()
        );
        if (!matched) {
          // Tag doesn't exist in project -> safe no-op
          return {
            status: 'COMPLETED',
            output: {
              action: 'REMOVE_TAG',
              tagName: rawTagName,
              wasPresent: false,
            },
          };
        }
        return await this.removeTag(matched.id, contactId, workspaceId, projectId, context);
      } catch (err: any) {
        return this.handleError(err);
      }
    }

    return await this.removeTag(rawTagId, contactId, workspaceId, projectId, context);
  }

  private async removeTag(
    tagId: string,
    contactId: string,
    workspaceId: string,
    projectId: string,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 1. Check if tag was present on contact (Natural Idempotency)
      const existingTags = await this.tagService.getContactTags(workspaceId, projectId, contactId);
      const isPresent = existingTags.some((t) => t.id === tagId);

      if (!isPresent) {
        return {
          status: 'COMPLETED',
          output: {
            action: 'REMOVE_TAG',
            tagId,
            wasPresent: false,
          },
          sideEffectId: `tag_rm_${tagId}`,
        };
      }

      // 2. Remove tag from contact via domain service
      await this.tagService.removeTagFromContact(
        workspaceId,
        projectId,
        contactId,
        tagId,
        context.executionId,
        'automation'
      );

      return {
        status: 'COMPLETED',
        output: {
          action: 'REMOVE_TAG',
          tagId,
          wasPresent: true,
        },
        sideEffectId: `tag_rm_${tagId}`,
      };
    } catch (err: any) {
      return this.handleError(err);
    }
  }

  private handleError(err: any): NodeExecutionResult {
    const msg = err?.message || String(err);
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
