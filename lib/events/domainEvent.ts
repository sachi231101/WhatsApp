// ============================================================================
// Domain Event Abstraction & Dispatcher
// ============================================================================

export type DomainEventType =
  | 'message.created'
  | 'conversation.created'
  | 'customer.replied'
  | 'contact.created'
  | 'contact.tag_added'
  | 'scheduled.trigger'
  | string;

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  workspaceId: string;
  projectId: string;
  occurredAt: string;
  payload: T;
  metadata?: {
    source?: 'meta' | 'user' | 'system' | 'automation' | 'scheduler' | string;
    correlationId?: string;
    actorId?: string | null;
    [key: string]: any;
  };
}

export type DomainEventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

class DomainEventDispatcher {
  private handlers = new Map<string, Set<DomainEventHandler>>();
  private globalHandlers = new Set<DomainEventHandler>();

  /**
   * Subscribe a handler to a specific event type.
   */
  subscribe<T = any>(eventType: string, handler: DomainEventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler as DomainEventHandler);

    return () => {
      handlers.delete(handler as DomainEventHandler);
    };
  }

  /**
   * Subscribe a handler to ALL domain events (e.g., for logging or trigger engine).
   */
  subscribeAll(handler: DomainEventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Publishes a domain event asynchronously to all subscribed listeners.
   * Execution errors in handlers are safely caught and logged, preventing
   * event emission from crashing the business event source.
   */
  async publish<T = any>(event: DomainEvent<T>): Promise<void> {
    if (!event || !event.type || !event.workspaceId || !event.projectId) {
      console.warn('[DomainEventDispatcher] Ignoring invalid event:', event);
      return;
    }

    const typeHandlers = this.handlers.get(event.type) || new Set();
    const allHandlers = [...Array.from(typeHandlers), ...Array.from(this.globalHandlers)];

    await Promise.all(
      allHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err: any) {
          console.error(
            `[DomainEventDispatcher] Handler error for event ${event.type} (${event.id}):`,
            err?.message || err
          );
        }
      })
    );
  }

  /**
   * Clear all registered handlers (used primarily for test isolation).
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }
}

export const domainEventDispatcher = new DomainEventDispatcher();

/**
 * Convenience helper to publish a domain event.
 */
export async function publishDomainEvent<T = any>(event: DomainEvent<T>): Promise<void> {
  return domainEventDispatcher.publish(event);
}
