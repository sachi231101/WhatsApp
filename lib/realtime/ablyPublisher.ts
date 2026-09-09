import Ably from 'ably';

export interface InboxRealtimeEvent {
  channel: string;
  name: string;
  event?: string;
  data: any;
  timestamp: string;
}

// In-memory test event buffer for unit and integration testing
export const testInboxRealtimeEvents: InboxRealtimeEvent[] = [];

export function clearTestInboxRealtimeEvents(): void {
  testInboxRealtimeEvents.length = 0;
}

export const testContactRealtimeEvents: InboxRealtimeEvent[] = [];

export function clearTestContactRealtimeEvents(): void {
  testContactRealtimeEvents.length = 0;
}

export const testAiRealtimeEvents: InboxRealtimeEvent[] = [];

export function clearTestAiRealtimeEvents(): void {
  testAiRealtimeEvents.length = 0;
}

let ablyClient: Ably.Realtime | null = null;

function getAblyKey(): string | undefined {
  return process.env.ABLY_KEY;
}

function isValidAblyKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return key.includes(':') && !key.startsWith('eyJ') && key !== 'your-ably-api-key';
}

function getAblyInstance(): Ably.Realtime | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (ablyClient) return ablyClient;

  const key = getAblyKey();
  if (!isValidAblyKey(key)) return null;

  try {
    ablyClient = new Ably.Realtime({ key: key!, clientId: 'wazzi-inbox-publisher' });
    return ablyClient;
  } catch (err) {
    console.warn('[AblyPublisher] Failed to initialize Ably Realtime:', err);
    return null;
  }
}

/**
 * Publishes an event to the tenant and project-scoped inbox channel:
 * `workspace:${workspaceId}:project:${projectId}:inbox`
 */
export async function publishInboxEvent(params: {
  workspaceId: string;
  projectId: string;
  event: string;
  data: any;
}): Promise<boolean> {
  const { workspaceId, projectId, event, data } = params;
  const channelName = `workspace:${workspaceId}:project:${projectId}:inbox`;

  // Always record to in-memory test recorder
  testInboxRealtimeEvents.push({
    channel: channelName,
    name: event,
    data,
    timestamp: new Date().toISOString(),
  });

  const ably = getAblyInstance();
  if (!ably) {
    return true; // Graceful offline/test fallback
  }

  try {
    const channel = ably.channels.get(channelName);
    await channel.publish(event, data);
    return true;
  } catch (err) {
    console.warn(`[AblyPublisher] Error publishing to ${channelName}:`, err);
    return false;
  }
}

/**
 * Publishes an event to the tenant and project-scoped contacts channel:
 * `workspace:${workspaceId}:project:${projectId}:contacts`
 */
export async function publishContactEvent(params: {
  workspaceId: string;
  projectId: string;
  event:
    | 'contact.created'
    | 'contact.updated'
    | 'contact.tag.updated'
    | 'contact.score.updated'
    | 'contact.activity.created';
  data: any;
}): Promise<boolean> {
  const { workspaceId, projectId, event, data } = params;
  const channelName = `workspace:${workspaceId}:project:${projectId}:contacts`;

  // Always record to in-memory test recorder
  testContactRealtimeEvents.push({
    channel: channelName,
    name: event,
    data,
    timestamp: new Date().toISOString(),
  });

  const ably = getAblyInstance();
  if (!ably) {
    return true; // Graceful offline/test fallback
  }

  try {
    const channel = ably.channels.get(channelName);
    await channel.publish(event, data);
    return true;
  } catch (err) {
    console.warn(`[AblyPublisher] Error publishing contact event to ${channelName}:`, err);
    return false;
  }
}

/**
 * Publishes an event to the tenant and project-scoped AI channel:
 * `workspace:${workspaceId}:project:${projectId}:ai`
 */
export async function publishAiEvent(params: {
  workspaceId: string;
  projectId: string;
  event:
    | 'ai.processing'
    | 'ai.response'
    | 'ai.escalated'
    | 'ai.error'
    | 'agent.updated'
    | 'agent.published'
    | 'agent.paused'
    | 'agent.archived'
    | 'agent.rollback';
  data: any;
}): Promise<boolean> {
  const { workspaceId, projectId, event, data } = params;
  const channelName = `workspace:${workspaceId}:project:${projectId}:ai`;

  // Always record to in-memory test recorder
  testAiRealtimeEvents.push({
    channel: channelName,
    name: event,
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  const ably = getAblyInstance();
  if (!ably) {
    return true; // Graceful offline/test fallback
  }

  try {
    const channel = ably.channels.get(channelName);
    await channel.publish(event, data);
    return true;
  } catch (err) {
    console.warn(`[AblyPublisher] Error publishing AI event to ${channelName}:`, err);
    return false;
  }
}

