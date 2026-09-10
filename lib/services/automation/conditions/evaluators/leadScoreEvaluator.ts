import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { ContactService } from '@/lib/services/contacts/contactService';
import { evaluateNumericOperator } from '../operators';

const contactService = new ContactService();

export class LeadScoreEvaluator implements ConditionEvaluator {
  readonly type = 'LEAD_SCORE';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const targetScore = configuration.value !== undefined ? configuration.value : configuration.score;

    if (targetScore === undefined || targetScore === null || isNaN(Number(targetScore))) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Target score value must be a valid number',
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    const numTarget = Number(targetScore);
    if (numTarget < 0 || numTarget > 100) {
      return {
        matched: false,
        branch: 'NO',
        reason: `Target score must be between 0 and 100. Received: ${numTarget}`,
        errorCode: 'INVALID_RANGE',
      };
    }

    const contactId = context.contactId || context.contact?.id;
    if (!contactId) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Contact ID is not available in execution context',
        errorCode: 'MISSING_CONTACT',
      };
    }

    let actualScore: number | null = null;
    if (context.contact) {
      // Validate tenant scoping
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
      actualScore =
        context.contact.leadScore !== undefined && context.contact.leadScore !== null
          ? Number(context.contact.leadScore)
          : null;
    } else {
      try {
        const contact = await contactService.getContactById(
          context.workspaceId,
          context.projectId,
          contactId
        );
        if (!contact) {
          return {
            matched: false,
            branch: 'NO',
            reason: 'Contact record was not found in project',
            errorCode: 'MISSING_CONTACT',
          };
        }
        actualScore = contact.leadScore !== undefined && contact.leadScore !== null ? Number(contact.leadScore) : null;
      } catch (err: any) {
        return {
          matched: false,
          branch: 'NO',
          reason: `Failed to load contact lead score: ${err.message || String(err)}`,
          errorCode: 'DATA_ACCESS_ERROR',
        };
      }
    }

    if (actualScore === null || isNaN(actualScore)) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Contact has no lead score defined (null)',
        evaluatedValue: null,
      };
    }

    const operator = String(configuration.operator || 'greater_than').toLowerCase();
    const matched = evaluateNumericOperator(operator, actualScore, numTarget);

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: actualScore,
      operator,
      metadata: {
        targetScore: numTarget,
        actualScore,
      },
    };
  }
}
