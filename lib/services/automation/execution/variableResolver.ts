import { ExecutionContext } from './types';

export class VariableResolver {
  private static readonly SENSITIVE_KEY_PATTERN = /(token|password|secret|key|apikey|credential|auth)/i;

  /**
   * Resolves dynamic template variables in a string (e.g. "Hello {{contact.first_name}}").
   */
  static resolveString(template: string, context: ExecutionContext): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, rawPath: string) => {
      const cleanPath = rawPath.trim();

      // Secrets redaction
      if (this.SENSITIVE_KEY_PATTERN.test(cleanPath)) {
        return '';
      }

      const val = this.extractValue(cleanPath, context);
      if (val === undefined || val === null) {
        return '';
      }
      if (typeof val === 'object') {
        return JSON.stringify(val);
      }
      return String(val);
    });
  }

  /**
   * Recursively traverses an object or array and resolves any string template variables.
   */
  static resolveObject<T = any>(data: T, context: ExecutionContext): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.resolveString(data, context) as any;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.resolveObject(item, context)) as any;
    }

    if (typeof data === 'object') {
      const resolved: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        resolved[k] = this.resolveObject(v, context);
      }
      return resolved as T;
    }

    return data;
  }

  /**
   * Extracts value using dot notation from context.variables or fallback triggers.
   */
  private static extractValue(path: string, context: ExecutionContext): any {
    const parts = path.split('.');

    // 1. Direct lookup in context.variables
    let val = this.traverse(context.variables, parts);
    if (val !== undefined) return val;

    // 2. Lookup in context.metadata.triggerContext (populated in Phase 10)
    const triggerContext = context.metadata?.triggerContext;
    if (triggerContext) {
      val = this.traverse(triggerContext, parts);
      if (val !== undefined) return val;

      // Check triggerContext.variables
      if (triggerContext.variables) {
        val = this.traverse(triggerContext.variables, parts);
        if (val !== undefined) return val;
      }
    }

    // 3. Fallback to direct top-level context properties
    const root = parts[0]?.toLowerCase();
    const prop = parts[1];

    if (root === 'contact') {
      if (prop === 'id') return context.contactId || '';
      // Check if contact data is in context.variables
      const contactObj = context.variables?.contact || triggerContext?.contact;
      if (contactObj && prop) {
        return this.findPropertyCaseInsensitive(contactObj, prop);
      }
    }

    if (root === 'conversation') {
      if (prop === 'id') return context.conversationId || '';
      const convObj = context.variables?.conversation || triggerContext?.conversation;
      if (convObj && prop) {
        return this.findPropertyCaseInsensitive(convObj, prop);
      }
    }

    if (root === 'message') {
      if (prop === 'id') return context.messageId || '';
      const msgObj = context.variables?.message || triggerContext?.message;
      if (msgObj && prop) {
        return this.findPropertyCaseInsensitive(msgObj, prop);
      }
    }

    return undefined;
  }

  private static traverse(obj: any, parts: string[]): any {
    if (!obj || typeof obj !== 'object') return undefined;

    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = this.findPropertyCaseInsensitive(current, part);
    }
    return current;
  }

  private static findPropertyCaseInsensitive(obj: any, key: string): any {
    if (!obj || typeof obj !== 'object') return undefined;

    // Direct match
    if (key in obj) return obj[key];

    // Case-insensitive / snake_case vs camelCase
    const normalizedKey = key.toLowerCase().replace(/_/g, '');
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().replace(/_/g, '') === normalizedKey) {
        return obj[k];
      }
    }

    return undefined;
  }
}
