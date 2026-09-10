import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { TagService } from '@/lib/services/contacts/tagService';
import { evaluateArrayOperator } from '../operators';

const tagService = new TagService();

export class ContactTagEvaluator implements ConditionEvaluator {
  readonly type = 'CONTACT_TAG';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const contactId = context.contactId || context.contact?.id;

    if (!contactId) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Contact ID is not available in execution context',
        errorCode: 'MISSING_CONTACT',
      };
    }

    // Verify contact belongs to current workspace/project if contact record is in context
    if (context.contact) {
      if (
        context.contact.workspaceId !== context.workspaceId ||
        context.contact.projectId !== context.projectId
      ) {
        return {
          matched: false,
          branch: 'NO',
          reason: 'Contact does not belong to the execution project/workspace',
          errorCode: 'TENANT_VIOLATION',
        };
      }
    }

    // Extract target tags/ids from configuration
    const targetTags: string[] = [];
    if (typeof configuration.tagId === 'string' && configuration.tagId.trim()) {
      targetTags.push(configuration.tagId.trim());
    }
    if (typeof configuration.tagName === 'string' && configuration.tagName.trim()) {
      targetTags.push(configuration.tagName.trim());
    }
    if (Array.isArray(configuration.tags)) {
      for (const t of configuration.tags) {
        if (typeof t === 'string' && t.trim()) targetTags.push(t.trim());
      }
    }
    if (Array.isArray(configuration.tagIds)) {
      for (const t of configuration.tagIds) {
        if (typeof t === 'string' && t.trim()) targetTags.push(t.trim());
      }
    }

    if (targetTags.length === 0) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'No tag identifiers configured for Contact Tag condition',
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    // Fetch contact's currently assigned tags through the tenant-scoped service
    let currentTags: Array<{ id: string; name: string }>;
    try {
      if (context.contact?.tags && Array.isArray(context.contact.tags)) {
        currentTags = context.contact.tags;
      } else {
        currentTags = await tagService.getContactTags(
          context.workspaceId,
          context.projectId,
          contactId
        );
      }
    } catch (err: any) {
      return {
        matched: false,
        branch: 'NO',
        reason: `Failed to load contact tags: ${err.message || String(err)}`,
        errorCode: 'DATA_ACCESS_ERROR',
      };
    }

    // Prepare list of both tag IDs and tag names
    const currentTagTokens: string[] = [];
    for (const ct of currentTags) {
      if (ct.id) currentTagTokens.push(ct.id);
      if (ct.name) currentTagTokens.push(ct.name);
    }

    const operator = String(configuration.operator || configuration.tagOperator || 'has').toLowerCase();

    // Map operator
    let matched = false;
    if (operator === 'has' || operator === 'has_any' || operator === 'matches_any') {
      matched = evaluateArrayOperator('matches_any', currentTagTokens, targetTags);
    } else if (operator === 'has_all' || operator === 'matches_all') {
      matched = evaluateArrayOperator('matches_all', currentTagTokens, targetTags);
    } else if (operator === 'does_not_have' || operator === 'not_contains') {
      matched = evaluateArrayOperator('does_not_have', currentTagTokens, targetTags);
    } else {
      matched = evaluateArrayOperator('matches_any', currentTagTokens, targetTags);
    }

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: currentTags.map((t) => t.name),
      operator,
      metadata: {
        targetTags,
        currentTagIds: currentTags.map((t) => t.id),
      },
    };
  }
}
