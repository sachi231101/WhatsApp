import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { TagService } from '@/lib/services/contacts/tagService';

export class AddTagExecutor implements ActionNodeExecutor {
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
        errorMessage: 'Cannot add tag: No contact associated with this workflow execution.',
      };
    }

    // Resolve tagId from config (support tagId, tagIds[0], or tags[0])
    const rawTagId =
      config.tagId ||
      (Array.isArray(config.tagIds) ? config.tagIds[0] : null) ||
      (Array.isArray(config.tags) && typeof config.tags[0] === 'string' && config.tags[0].length === 36
        ? config.tags[0]
        : null);

    if (!rawTagId) {
      // If tag name is provided instead of tagId in config.tags
      const rawTagName =
        config.tagName ||
        (Array.isArray(config.tags) && typeof config.tags[0] === 'string' ? config.tags[0] : null);

      if (!rawTagName) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_CONFIGURATION',
          errorMessage: 'Cannot add tag: "tagId" or "tags" is required in node configuration.',
        };
      }

      // Look up tag by name within the project
      try {
        const projectTags = await this.tagService.getProjectTags(workspaceId, projectId);
        const matched = projectTags.find(
          (t) => t.name.toLowerCase() === rawTagName.trim().toLowerCase()
        );
        if (!matched) {
          return {
            status: 'FAILED',
            errorCode: 'RESOURCE_NOT_FOUND',
            errorMessage: `Tag "${rawTagName}" does not exist in this project.`,
          };
        }
        return await this.applyTag(matched.id, contactId, workspaceId, projectId, context);
      } catch (err: any) {
        return this.handleError(err);
      }
    }

    return await this.applyTag(rawTagId, contactId, workspaceId, projectId, context);
  }

  private async applyTag(
    tagId: string,
    contactId: string,
    workspaceId: string,
    projectId: string,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 1. Check if tag already present on contact (Natural Idempotency)
      const existingTags = await this.tagService.getContactTags(workspaceId, projectId, contactId);
      const isAlreadyPresent = existingTags.some((t) => t.id === tagId);

      if (isAlreadyPresent) {
        return {
          status: 'COMPLETED',
          output: {
            action: 'ADD_TAG',
            tagId,
            alreadyPresent: true,
          },
          sideEffectId: `tag_${tagId}`,
        };
      }

      // 2. Add tag to contact via domain service
      await this.tagService.addTagToContact(
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
          action: 'ADD_TAG',
          tagId,
          alreadyPresent: false,
        },
        sideEffectId: `tag_${tagId}`,
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
