import { DomainEvent } from '@/lib/events/domainEvent';

// ============================================================================
// Normalized Trigger Context
// ============================================================================

export interface TriggerContext {
  eventId: string;
  eventType: string;
  workspaceId: string;
  projectId: string;
  occurredAt: string;
  contactId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  metaMessageId?: string | null;
  phoneNumberId?: string | null;
  phoneNumber?: string | null;
  messageType?: string | null;
  messageBody?: string | null;
  isNewContact?: boolean;
  tagId?: string | null;
  tagName?: string | null;
  channel?: string | null;
  direction?: 'inbound' | 'outbound' | string | null;
  senderType?: 'customer' | 'user' | 'system' | 'automation' | string | null;
  source?: string | null;
  payload: Record<string, any>;
}

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /auth/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
];

/**
 * Recursively strips sensitive fields (access tokens, credentials, secrets)
 * to ensure security when storing execution metadata or queue payloads.
 */
export function sanitizePayload(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Builds a standardized TriggerContext from an incoming DomainEvent.
 */
export function createTriggerContext(event: DomainEvent): TriggerContext {
  const p = event.payload || {};

  return {
    eventId: event.id,
    eventType: event.type,
    workspaceId: event.workspaceId,
    projectId: event.projectId,
    occurredAt: event.occurredAt || new Date().toISOString(),
    contactId: p.contactId || p.contact?.id || null,
    conversationId: p.conversationId || null,
    messageId: p.messageId || p.message?.id || null,
    metaMessageId: p.metaMessageId || p.message?.metaMessageId || null,
    phoneNumberId: p.phoneNumberId || null,
    phoneNumber: p.phoneNumber || p.from || p.destPhone || p.contact?.phoneNumber || null,
    messageType: p.messageType || p.type || p.message?.type || null,
    messageBody: p.messageBody || p.body || p.message?.body || null,
    isNewContact: Boolean(p.isNewContact),
    tagId: p.tagId || null,
    tagName: p.tagName || null,
    channel: p.channel || 'WHATSAPP',
    direction: p.direction || p.message?.direction || null,
    senderType: p.senderType || p.message?.senderType || null,
    source: event.metadata?.source || p.source || null,
    payload: sanitizePayload(p),
  };
}
