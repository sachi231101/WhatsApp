import { ConditionErrorCode } from './types';

export interface ConditionValidationResult {
  valid: boolean;
  errors: string[];
  errorCode?: ConditionErrorCode;
}

const SUPPORTED_CONDITION_TYPES = [
  'MESSAGE_CONTAINS',
  'CONTACT_TAG',
  'LEAD_SCORE',
  'CUSTOM_FIELD',
  'TIME_CONDITION',
  'CONVERSATION_STATUS',
  'CONVERSATION_ASSIGNEE',
  'AI_INTENT',
];

const VALID_CONVERSATION_STATUSES = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

const VALID_ASSIGNEE_STATES = ['IS_ASSIGNED', 'IS_UNASSIGNED', 'SPECIFIC_USER'];

export class ConditionValidator {
  /**
   * Validates whether the condition type is recognized.
   */
  static isSupportedType(type: string): boolean {
    return SUPPORTED_CONDITION_TYPES.includes(type.toUpperCase().trim());
  }

  /**
   * Validates a condition configuration at runtime or builder save time.
   */
  static validate(type: string, config: Record<string, any>): ConditionValidationResult {
    const normType = (type || '').toUpperCase().trim();

    if (!this.isSupportedType(normType)) {
      return {
        valid: false,
        errors: [`Unsupported condition node type: ${type}`],
        errorCode: 'UNSUPPORTED_NODE_TYPE',
      };
    }

    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Condition configuration must be a non-empty object'],
        errorCode: 'INVALID_CONFIGURATION',
      };
    }

    switch (normType) {
      case 'MESSAGE_CONTAINS':
        return this.validateMessageContains(config);
      case 'CONTACT_TAG':
        return this.validateContactTag(config);
      case 'LEAD_SCORE':
        return this.validateLeadScore(config);
      case 'CUSTOM_FIELD':
        return this.validateCustomField(config);
      case 'TIME_CONDITION':
        return this.validateTimeCondition(config);
      case 'CONVERSATION_STATUS':
        return this.validateConversationStatus(config);
      case 'CONVERSATION_ASSIGNEE':
        return this.validateConversationAssignee(config);
      case 'AI_INTENT':
        return this.validateAIIntent(config);
      default:
        return {
          valid: false,
          errors: [`Unknown condition type: ${type}`],
          errorCode: 'UNSUPPORTED_NODE_TYPE',
        };
    }
  }

  private static validateMessageContains(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const val = config.value ?? config.phrase ?? config.text;
    const phrases = config.phrases;

    const hasValue = typeof val === 'string' && val.trim().length > 0;
    const hasPhrases = Array.isArray(phrases) && phrases.length > 0 && phrases.some((p) => typeof p === 'string' && p.trim().length > 0);

    if (!hasValue && !hasPhrases) {
      errors.push('Message Contains requires at least one phrase or value to match against.');
    }

    const op = String(config.operator || config.matchOperator || 'contains').toLowerCase();
    const validOperators = ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'regex', 'exact', 'contains_all'];
    if (!validOperators.includes(op)) {
      errors.push(`Invalid operator "${op}" for Message Contains. Supported: ${validOperators.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_CONFIGURATION' : undefined,
    };
  }

  private static validateContactTag(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const tagId = config.tagId || config.tagName;
    const tags = config.tags || config.tagIds;

    const hasSingleTag = typeof tagId === 'string' && tagId.trim().length > 0;
    const hasMultipleTags = Array.isArray(tags) && tags.length > 0 && tags.some((t) => typeof t === 'string' && t.trim().length > 0);

    if (!hasSingleTag && !hasMultipleTags) {
      errors.push('Contact Tag condition requires at least one tag identifier or tag name.');
    }

    const op = String(config.operator || config.tagOperator || 'has').toLowerCase();
    const validOps = ['has', 'does_not_have', 'has_any', 'has_all', 'matches_any', 'matches_all', 'contains', 'not_contains'];
    if (!validOps.includes(op)) {
      errors.push(`Invalid operator "${op}" for Contact Tag. Supported: ${validOps.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_CONFIGURATION' : undefined,
    };
  }

  private static validateLeadScore(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const scoreVal = config.value !== undefined ? config.value : config.score;

    if (scoreVal === undefined || scoreVal === null || isNaN(Number(scoreVal))) {
      errors.push('Lead Score requires a valid numeric comparison value.');
    } else {
      const num = Number(scoreVal);
      if (num < 0 || num > 100) {
        errors.push(`Lead Score value must be between 0 and 100. Received: ${num}`);
      }
    }

    const op = String(config.operator || 'greater_than').toLowerCase();
    const validOps = ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal'];
    if (!validOps.includes(op)) {
      errors.push(`Invalid operator "${op}" for Lead Score. Supported: ${validOps.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? (errors.some((e) => e.includes('between 0 and 100')) ? 'INVALID_RANGE' : 'INVALID_CONFIGURATION') : undefined,
    };
  }

  private static validateCustomField(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const fieldIdent = config.fieldId || config.fieldName || config.fieldKey;

    if (!fieldIdent || typeof fieldIdent !== 'string' || !fieldIdent.trim()) {
      errors.push('Custom Field condition requires a valid fieldId or fieldName.');
    }

    const op = String(config.operator || 'equals').toLowerCase();
    const validOps = [
      'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
      'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal',
      'before', 'after', 'before_or_equal', 'after_or_equal',
      'exists', 'not_exists', 'matches_any', 'has', 'does_not_have'
    ];
    if (!validOps.includes(op)) {
      errors.push(`Invalid operator "${op}" for Custom Field.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_CONFIGURATION' : undefined,
    };
  }

  private static validateTimeCondition(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const timezone = config.timezone || 'UTC';

    // Validate IANA timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      errors.push(`Invalid IANA timezone identifier: "${timezone}". Example valid timezone: "Asia/Kolkata", "UTC", "America/New_York"`);
      return {
        valid: false,
        errors,
        errorCode: 'INVALID_TIMEZONE',
      };
    }

    // Extract start and end times
    const startTime = config.startTime || config.businessHours?.start;
    const endTime = config.endTime || config.businessHours?.end;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (startTime && !timeRegex.test(startTime)) {
      errors.push(`Invalid startTime "${startTime}". Must be in 24-hour "HH:mm" format (e.g. "09:00").`);
    }
    if (endTime && !timeRegex.test(endTime)) {
      errors.push(`Invalid endTime "${endTime}". Must be in 24-hour "HH:mm" format (e.g. "18:00").`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_DATE' : undefined,
    };
  }

  private static validateConversationStatus(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const status = String(config.status || config.targetStatus || '').toUpperCase().trim();

    if (!status || !VALID_CONVERSATION_STATUSES.includes(status)) {
      errors.push(`Invalid conversation status "${status}". Must be one of: ${VALID_CONVERSATION_STATUSES.join(', ')}`);
    }

    const op = String(config.operator || 'equals').toLowerCase();
    if (!['equals', 'not_equals'].includes(op)) {
      errors.push(`Invalid operator "${op}" for Conversation Status. Must be "equals" or "not_equals".`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_CONFIGURATION' : undefined,
    };
  }

  private static validateConversationAssignee(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const assigneeState = config.assigneeState;
    const userId = config.userId ?? config.assignedUserId;

    if (assigneeState && !VALID_ASSIGNEE_STATES.includes(assigneeState)) {
      errors.push(`Invalid assigneeState "${assigneeState}". Must be one of: ${VALID_ASSIGNEE_STATES.join(', ')}`);
    }

    if (assigneeState === 'SPECIFIC_USER' && (!userId || typeof userId !== 'string')) {
      errors.push('SPECIFIC_USER requires a valid assigned userId.');
    }

    const op = String(config.operator || 'equals').toLowerCase();
    if (!['equals', 'not_equals'].includes(op)) {
      errors.push(`Invalid operator "${op}" for Conversation Assignee. Must be "equals" or "not_equals".`);
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_CONFIGURATION' : undefined,
    };
  }

  private static validateAIIntent(config: Record<string, any>): ConditionValidationResult {
    const errors: string[] = [];
    const intent = config.intent || config.targetIntent;

    if (!intent || typeof intent !== 'string' || !intent.trim()) {
      errors.push('AI Intent requires a target intent string (e.g. "pricing_question").');
    }

    const conf = config.minimumConfidence ?? config.confidenceThreshold;
    if (conf !== undefined && conf !== null) {
      const num = Number(conf);
      if (isNaN(num) || num < 0 || num > 1) {
        errors.push(`Minimum confidence must be a number between 0.0 and 1.0. Received: ${conf}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_CONFIGURATION' : undefined,
    };
  }
}
