import { ConditionEvaluator, ConditionExecutionContext, ConditionEvaluationResult } from '../types';
import { CustomFieldService, CustomFieldValueRecord, CustomFieldType } from '@/lib/services/contacts/customFieldService';
import {
  evaluateStringOperator,
  evaluateNumericOperator,
  evaluateDateOperator,
  evaluateBooleanOperator,
  evaluateArrayOperator,
} from '../operators';

const customFieldService = new CustomFieldService();

const VALID_OPERATORS_BY_TYPE: Record<CustomFieldType, string[]> = {
  TEXT: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'exists', 'not_exists', 'regex'],
  NUMBER: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'exists', 'not_exists'],
  BOOLEAN: ['equals', 'not_equals', 'exists', 'not_exists'],
  DATE: ['equals', 'not_equals', 'before', 'after', 'before_or_equal', 'after_or_equal', 'exists', 'not_exists'],
  SELECT: ['equals', 'not_equals', 'matches_any', 'has', 'does_not_have', 'exists', 'not_exists'],
  MULTI_SELECT: ['equals', 'not_equals', 'matches_any', 'has', 'does_not_have', 'matches_all', 'has_all', 'exists', 'not_exists'],
};

export class CustomFieldEvaluator implements ConditionEvaluator {
  readonly type = 'CUSTOM_FIELD';

  async evaluate(
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const fieldIdentifier = configuration.fieldId || configuration.fieldName || configuration.fieldKey;

    if (!fieldIdentifier) {
      return {
        matched: false,
        branch: 'NO',
        reason: 'Custom field identifier (fieldId/fieldName) is required',
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    // Support checking context variables (e.g. ai.sentiment, sentiment, ai.extracted.<field>)
    const resolveContextVariable = (identifier: string) => {
      if (!context.variables) return undefined;
      if (context.variables[identifier] !== undefined) return context.variables[identifier];
      if (context.variables.ai && context.variables.ai[identifier] !== undefined) {
        return context.variables.ai[identifier];
      }
      const parts = identifier.split('.');
      let cur: any = context.variables;
      for (const p of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[p];
      }
      if (cur !== undefined) return cur;
      return undefined;
    };

    const contextVarVal = resolveContextVariable(fieldIdentifier);
    if (contextVarVal !== undefined) {
      const operator = String(configuration.operator || 'equals').toLowerCase().trim();
      const fieldType: CustomFieldType =
        typeof contextVarVal === 'number' ? 'NUMBER' : typeof contextVarVal === 'boolean' ? 'BOOLEAN' : 'TEXT';

      const allowedOps = VALID_OPERATORS_BY_TYPE[fieldType] || [];
      if (!allowedOps.includes(operator)) {
        return {
          matched: false,
          branch: 'NO',
          reason: `Operator "${operator}" is not supported for type ${fieldType}. Allowed: ${allowedOps.join(', ')}`,
          errorCode: 'INVALID_OPERATOR',
        };
      }

      let matched = false;
      switch (fieldType) {
        case 'TEXT':
          matched = evaluateStringOperator(operator, String(contextVarVal), configuration.value, { caseSensitive: configuration.caseSensitive });
          break;
        case 'NUMBER':
          matched = evaluateNumericOperator(operator, Number(contextVarVal), configuration.value);
          break;
        case 'BOOLEAN':
          matched = evaluateBooleanOperator(operator, Boolean(contextVarVal), configuration.value);
          break;
      }

      return {
        matched,
        branch: matched ? 'YES' : 'NO',
        evaluatedValue: contextVarVal,
        operator,
        metadata: {
          fieldIdentifier,
          fieldType,
          evaluatedValue: contextVarVal,
          targetValue: configuration.value,
          matched,
          source: 'context_variables',
        },
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

    // Load custom field values for contact (scoped strictly to workspaceId + projectId)
    let fieldValues: CustomFieldValueRecord[];
    if (context.customFieldValues && Array.isArray(context.customFieldValues)) {
      fieldValues = context.customFieldValues.map((cf) => ({
        definitionId: cf.definitionId || cf.key || '',
        name: cf.name || cf.key || '',
        key: cf.key || cf.name || '',
        type: (cf.type || 'TEXT') as CustomFieldType,
        required: false,
        options: [] as string[],
        value: cf.value,
      }));
    } else {
      try {
        fieldValues = await customFieldService.getFieldValuesForContact(
          context.workspaceId,
          context.projectId,
          contactId
        );
      } catch (err: any) {
        if (err.message?.includes('Contact not found')) {
          return {
            matched: false,
            branch: 'NO',
            reason: 'Contact not found or does not belong to this project.',
            errorCode: 'MISSING_CONTACT',
          };
        }
        return {
          matched: false,
          branch: 'NO',
          reason: `Failed to load custom fields: ${err.message || String(err)}`,
          errorCode: 'DATA_ACCESS_ERROR',
        };
      }
    }

    // Find the matching field definition
    const field = fieldValues.find(
      (f) =>
        f.definitionId === fieldIdentifier ||
        f.key.toLowerCase() === String(fieldIdentifier).toLowerCase() ||
        f.name.toLowerCase() === String(fieldIdentifier).toLowerCase()
    );

    if (!field) {
      return {
        matched: false,
        branch: 'NO',
        reason: `Custom field "${fieldIdentifier}" does not exist in this project`,
        errorCode: 'MISSING_FIELD',
      };
    }

    const operator = String(configuration.operator || 'equals').toLowerCase().trim();
    const fieldType = field.type;

    // Validate operator for this field type
    const allowedOps = VALID_OPERATORS_BY_TYPE[fieldType] || [];
    if (!allowedOps.includes(operator)) {
      return {
        matched: false,
        branch: 'NO',
        reason: `Operator "${operator}" is not supported for field type "${fieldType}"`,
        errorCode: 'INVALID_OPERATOR',
      };
    }

    const targetValue = configuration.value !== undefined ? configuration.value : configuration.fieldValue;
    const actualValue = field.value;

    let matched = false;

    // Evaluate based on field type
    switch (fieldType) {
      case 'TEXT': {
        matched = evaluateStringOperator(operator, actualValue, targetValue);
        break;
      }
      case 'NUMBER': {
        matched = evaluateNumericOperator(operator, actualValue, targetValue);
        break;
      }
      case 'BOOLEAN': {
        matched = evaluateBooleanOperator(operator, actualValue, targetValue);
        break;
      }
      case 'DATE': {
        matched = evaluateDateOperator(operator, actualValue, targetValue);
        break;
      }
      case 'SELECT': {
        if (operator === 'equals' || operator === 'not_equals') {
          matched = evaluateStringOperator(operator, actualValue, targetValue);
        } else {
          const actArr = Array.isArray(actualValue) ? actualValue : [actualValue];
          const tgtArr = Array.isArray(targetValue) ? targetValue : [targetValue];
          matched = evaluateArrayOperator(operator, actArr, tgtArr);
        }
        break;
      }
      case 'MULTI_SELECT': {
        const actArr = Array.isArray(actualValue) ? actualValue : [actualValue];
        const tgtArr = Array.isArray(targetValue) ? targetValue : [targetValue];
        matched = evaluateArrayOperator(operator, actArr, tgtArr);
        break;
      }
      default: {
        matched = evaluateStringOperator(operator, actualValue, targetValue);
        break;
      }
    }

    return {
      matched,
      branch: matched ? 'YES' : 'NO',
      evaluatedValue: actualValue,
      operator,
      metadata: {
        fieldName: field.name,
        fieldKey: field.key,
        fieldType,
        targetValue,
      },
    };
  }
}
