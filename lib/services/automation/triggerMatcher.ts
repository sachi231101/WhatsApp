import { TriggerContext } from './triggerContext';
import { AutomationNodeRecord } from './types';

// ============================================================================
// Trigger Matcher
// ============================================================================

export interface TriggerMatchResult {
  matched: boolean;
  reason?: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class TriggerMatcher {
  /**
   * Main entry point to evaluate if an automation's trigger node matches an incoming event context.
   */
  static matches(
    triggerNode: AutomationNodeRecord,
    context: TriggerContext
  ): TriggerMatchResult {
    const nodeType = String(triggerNode.type || '').toUpperCase().trim();
    const config = triggerNode.configuration || {};

    switch (nodeType) {
      case 'NEW_WHATSAPP_MESSAGE':
        return this.matchesNewWhatsAppMessage(config, context);

      case 'KEYWORD_MATCH':
        return this.matchesKeyword(config, context);

      case 'CONVERSATION_CREATED':
        return this.matchesConversationCreated(config, context);

      case 'CUSTOMER_REPLIED':
        return this.matchesCustomerReply(config, context);

      case 'CONTACT_CREATED':
        return this.matchesContactCreated(config, context);

      case 'TAG_ADDED':
        return this.matchesTagAdded(config, context);

      case 'SCHEDULED_TRIGGER':
        return this.matchesSchedule(config, context);

      default:
        return {
          matched: false,
          reason: `Unsupported or unknown trigger node type: "${triggerNode.type}".`,
        };
    }
  }

  /**
   * NEW_WHATSAPP_MESSAGE trigger matching.
   */
  static matchesNewWhatsAppMessage(config: any, context: TriggerContext): TriggerMatchResult {
    // Only message.created events qualify
    if (context.eventType !== 'message.created') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "message.created".` };
    }

    // Direction check: only inbound messages trigger this
    if (context.direction && context.direction !== 'inbound') {
      return { matched: false, reason: `Message direction is "${context.direction}", expected "inbound".` };
    }

    // 1. Phone number matching
    const cfgPhone = config.whatsappNumber;
    if (cfgPhone && cfgPhone !== 'ALL') {
      const match =
        (context.phoneNumberId && String(context.phoneNumberId) === String(cfgPhone)) ||
        (context.phoneNumber && String(context.phoneNumber).replace(/\D/g, '') === String(cfgPhone).replace(/\D/g, ''));
      if (!match) {
        return { matched: false, reason: `Phone number filter "${cfgPhone}" did not match message.` };
      }
    }

    // 2. Message type matching
    const cfgType = config.messageType;
    if (cfgType && cfgType !== 'ALL') {
      const msgType = String(context.messageType || 'text').toLowerCase();
      const targetType = String(cfgType).toLowerCase();

      if (targetType === 'media') {
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        if (!mediaTypes.includes(msgType)) {
          return { matched: false, reason: `Message type "${msgType}" is not media.` };
        }
      } else if (msgType !== targetType) {
        return { matched: false, reason: `Message type "${msgType}" does not match filter "${targetType}".` };
      }
    }

    // 3. Only new contacts filter
    if (config.onlyNewContacts === true) {
      if (!context.isNewContact) {
        return { matched: false, reason: 'Automation requires new contact, but contact already existed.' };
      }
    }

    // 4. Optional keywords filter on NEW_WHATSAPP_MESSAGE
    if (config.keywords && (Array.isArray(config.keywords) ? config.keywords.length > 0 : String(config.keywords).trim().length > 0)) {
      const kwResult = this.matchesKeyword(config, context);
      if (!kwResult.matched) {
        return kwResult;
      }
    }

    return { matched: true };
  }

  /**
   * KEYWORD_MATCH trigger matching.
   */
  static matchesKeyword(config: any, context: TriggerContext): TriggerMatchResult {
    if (context.eventType !== 'message.created') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "message.created".` };
    }

    // Inbound check
    if (context.direction && context.direction !== 'inbound') {
      return { matched: false, reason: 'Keyword match only applies to inbound messages.' };
    }

    const rawText = context.messageBody;
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return { matched: false, reason: 'Message contains no text content to match keywords against.' };
    }

    // Parse keywords
    let rawKeywords: string[] = [];
    if (Array.isArray(config.keywords)) {
      rawKeywords = config.keywords.map(String);
    } else if (typeof config.keywords === 'string') {
      rawKeywords = config.keywords.split(',').map((k: string) => k.trim());
    }

    const keywords = rawKeywords.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    if (keywords.length === 0) {
      return { matched: false, reason: 'No valid keywords configured for matching.' };
    }

    const caseSensitive = Boolean(config.caseSensitive);
    const wholeWord = Boolean(config.wholeWord);
    const mode = String(config.matchMode || 'CONTAINS').toUpperCase();

    const textToSearch = caseSensitive ? rawText.trim() : rawText.trim().toLowerCase();

    const matchesSingleKeyword = (kw: string): boolean => {
      const term = caseSensitive ? kw : kw.toLowerCase();
      if (wholeWord) {
        const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, caseSensitive ? '' : 'i');
        return regex.test(rawText);
      }
      if (mode === 'EXACT') {
        return textToSearch === term;
      }
      if (mode === 'STARTS_WITH') {
        return textToSearch.startsWith(term);
      }
      return textToSearch.includes(term);
    };

    if (mode === 'ALL') {
      const allMatched = keywords.every(matchesSingleKeyword);
      return allMatched
        ? { matched: true }
        : { matched: false, reason: 'Message did not match all required keywords.' };
    }

    // Default: ANY, CONTAINS, EXACT, STARTS_WITH (matches at least one)
    const anyMatched = keywords.some(matchesSingleKeyword);
    return anyMatched
      ? { matched: true }
      : { matched: false, reason: 'Message did not match any of the configured keywords.' };
  }

  /**
   * CONVERSATION_CREATED trigger matching.
   */
  static matchesConversationCreated(config: any, context: TriggerContext): TriggerMatchResult {
    if (context.eventType !== 'conversation.created') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "conversation.created".` };
    }

    const cfgChannel = config.channel;
    if (cfgChannel && cfgChannel !== 'ALL') {
      const eventChannel = String(context.channel || 'WHATSAPP').toUpperCase();
      if (eventChannel !== String(cfgChannel).toUpperCase()) {
        return { matched: false, reason: `Channel "${eventChannel}" does not match configured channel "${cfgChannel}".` };
      }
    }

    return { matched: true };
  }

  /**
   * CUSTOMER_REPLIED trigger matching.
   */
  static matchesCustomerReply(_config: any, context: TriggerContext): TriggerMatchResult {
    if (context.eventType !== 'message.created' && context.eventType !== 'customer.replied') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "message.created".` };
    }

    // Must be inbound direction
    if (context.direction !== 'inbound') {
      return { matched: false, reason: 'Outbound messages cannot trigger customer reply.' };
    }

    // Must be from customer, never from user/agent/bot/ai/system/automation
    const sender = String(context.senderType || 'customer').toLowerCase();
    if (sender !== 'customer') {
      return { matched: false, reason: `Sender type "${sender}" is not a customer reply.` };
    }

    // Prevent self-triggering from automation events
    if (context.source === 'automation') {
      return { matched: false, reason: 'Internal automation events cannot trigger customer reply.' };
    }

    return { matched: true };
  }

  /**
   * CONTACT_CREATED trigger matching.
   */
  static matchesContactCreated(config: any, context: TriggerContext): TriggerMatchResult {
    if (context.eventType !== 'contact.created') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "contact.created".` };
    }

    const cfgSource = config.source;
    if (cfgSource && cfgSource !== 'ANY') {
      const eventSource = String(context.source || '').toUpperCase();
      if (eventSource !== String(cfgSource).toUpperCase()) {
        return { matched: false, reason: `Contact source "${eventSource}" does not match filter "${cfgSource}".` };
      }
    }

    return { matched: true };
  }

  /**
   * TAG_ADDED trigger matching.
   */
  static matchesTagAdded(config: any, context: TriggerContext): TriggerMatchResult {
    if (context.eventType !== 'contact.tag_added') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "contact.tag_added".` };
    }

    // If matchAny is enabled, any tag added matches
    if (config.matchAny === true) {
      return { matched: true };
    }

    const targetTagName = config.tagName ? String(config.tagName).trim().toLowerCase() : null;
    const targetTagId = config.tagId ? String(config.tagId).trim() : null;

    if (!targetTagName && !targetTagId) {
      // Empty configuration matches any tag
      return { matched: true };
    }

    const eventTagId = context.tagId ? String(context.tagId).trim() : null;
    const eventTagName = context.tagName ? String(context.tagName).trim().toLowerCase() : null;

    if (targetTagId && eventTagId && targetTagId === eventTagId) {
      return { matched: true };
    }

    if (targetTagName && eventTagName && targetTagName === eventTagName) {
      return { matched: true };
    }

    return { matched: false, reason: `Added tag "${eventTagName || eventTagId}" does not match target tag.` };
  }

  /**
   * SCHEDULED_TRIGGER trigger matching.
   */
  static matchesSchedule(_config: any, context: TriggerContext): TriggerMatchResult {
    if (context.eventType !== 'scheduled.trigger') {
      return { matched: false, reason: `Event type is "${context.eventType}", expected "scheduled.trigger".` };
    }

    // Verify target automation ID if present in schedule payload
    const targetAutomationId = context.payload?.automationId;
    if (targetAutomationId && context.payload?.targetAutomationId) {
      if (targetAutomationId !== context.payload.targetAutomationId) {
        return { matched: false, reason: 'Scheduled event was designated for a different automation.' };
      }
    }

    return { matched: true };
  }
}
