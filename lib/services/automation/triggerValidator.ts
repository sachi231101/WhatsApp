// ============================================================================
// Trigger Configuration Validator
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class TriggerValidator {
  /**
   * Validate trigger configuration at runtime before matching or execution.
   */
  static validate(triggerType: string, config: any): ValidationResult {
    const normalizedType = String(triggerType || '').toUpperCase().trim();
    const cfg = config && typeof config === 'object' ? config : {};
    const errors: string[] = [];

    switch (normalizedType) {
      case 'NEW_WHATSAPP_MESSAGE': {
        if (cfg.whatsappNumber !== undefined && typeof cfg.whatsappNumber !== 'string') {
          errors.push('WhatsApp number must be a string identifier or "ALL".');
        }
        if (cfg.messageType !== undefined && typeof cfg.messageType !== 'string') {
          errors.push('Message type must be a valid string or "ALL".');
        }
        if (cfg.onlyNewContacts !== undefined && typeof cfg.onlyNewContacts !== 'boolean') {
          errors.push('onlyNewContacts must be a boolean.');
        }
        break;
      }

      case 'KEYWORD_MATCH': {
        const keywords = cfg.keywords;
        if (!keywords) {
          errors.push('Keywords configuration is required.');
        } else if (Array.isArray(keywords)) {
          const filtered = keywords.filter((k) => typeof k === 'string' && k.trim().length > 0);
          if (filtered.length === 0) {
            errors.push('At least one non-empty keyword is required.');
          }
        } else if (typeof keywords === 'string') {
          if (keywords.trim().length === 0) {
            errors.push('Keywords string cannot be empty.');
          }
        } else {
          errors.push('Keywords must be an array of strings or a comma-separated string.');
        }

        const validModes = ['CONTAINS', 'EXACT', 'STARTS_WITH', 'ANY', 'ALL'];
        if (cfg.matchMode && !validModes.includes(String(cfg.matchMode).toUpperCase())) {
          errors.push(`Invalid matchMode: "${cfg.matchMode}". Allowed: ${validModes.join(', ')}.`);
        }
        break;
      }

      case 'CONVERSATION_CREATED': {
        if (cfg.channel !== undefined && typeof cfg.channel !== 'string') {
          errors.push('Channel must be a string identifier or "ALL".');
        }
        break;
      }

      case 'CUSTOMER_REPLIED': {
        if (cfg.withinHours !== undefined) {
          const num = Number(cfg.withinHours);
          if (isNaN(num) || num < 0) {
            errors.push('withinHours must be a non-negative number.');
          }
        }
        break;
      }

      case 'CONTACT_CREATED': {
        if (cfg.source !== undefined && typeof cfg.source !== 'string') {
          errors.push('Source must be a string identifier.');
        }
        break;
      }

      case 'TAG_ADDED': {
        const hasTag = Boolean(
          (typeof cfg.tagName === 'string' && cfg.tagName.trim().length > 0) ||
          (typeof cfg.tagId === 'string' && cfg.tagId.trim().length > 0) ||
          cfg.matchAny === true
        );
        if (!hasTag && cfg.tagName !== undefined && cfg.tagName !== '') {
          errors.push('A valid tag name, tag ID, or matchAny flag must be configured.');
        }
        break;
      }

      case 'SCHEDULED_TRIGGER': {
        const cron = cfg.cron;
        if (!cron || typeof cron !== 'string' || cron.trim().split(/\s+/).length < 5) {
          errors.push('Valid cron expression with at least 5 fields is required.');
        }
        if (cfg.timezone !== undefined && typeof cfg.timezone !== 'string') {
          errors.push('Timezone must be a valid string identifier.');
        }
        break;
      }

      default:
        // Other trigger types are accepted if valid object
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
