import { Worker, type Job } from 'bullmq';
import { sql } from '@/lib/db';
import { getRedisOptions } from './redis';
import { AI_MESSAGE_QUEUE_NAME, type AIMessageJobData } from './aiMessageQueue';
import { AIOrchestrator } from '@/lib/ai/aiOrchestrator';
import { inboxService } from '@/lib/services/inbox/inboxService';
import { publishAiEvent } from '@/lib/realtime/ablyPublisher';
import { publishInboxEvent } from '@/lib/realtime/ablyPublisher';

export interface AiProcessResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  response?: string;
  shouldEscalate?: boolean;
  error?: string;
}

/**
 * Processes an inbound WhatsApp AI message job:
 * 1. Checks conversation handling mode (respects HUMAN_HANDLING takeover).
 * 2. Runs AIOrchestrator with conversation context.
 * 3. Handles escalation or dispatches AI response via outbound WhatsApp queue.
 */
export async function processAiJob(data: AIMessageJobData): Promise<AiProcessResult> {
  const { workspaceId, projectId, conversationId, messageId, messageBody, contactId } = data;

  try {
    // 1. Fetch conversation details & handling mode
    const { rows: convRows } = await sql`
      SELECT id, handling_mode, status, assigned_user_id, contact_id
      FROM conversations
      WHERE id = ${conversationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      LIMIT 1
    `;

    if (convRows.length === 0) {
      return { success: false, error: 'Conversation not found or access denied' };
    }

    const conv = convRows[0];

    // If human agent has taken over, do NOT respond automatically!
    if (conv.handling_mode === 'HUMAN_HANDLING') {
      return {
        success: true,
        skipped: true,
        reason: 'HUMAN_HANDLING: AI responses paused for human takeover.',
      };
    }

    // Emit processing event
    await publishAiEvent({
      workspaceId,
      projectId,
      event: 'ai.processing',
      data: { conversationId, messageId },
    });

    // 2. Invoke AI Orchestrator
    const result = await AIOrchestrator.handleInboundMessage({
      workspaceId,
      projectId,
      conversationId,
      lastUserMessage: messageBody,
    });

    if (!result) {
      return {
        success: true,
        skipped: true,
        reason: 'NO_ACTIVE_AGENT: No active published AI Agent for project.',
      };
    }

    // 3. Handle Human Escalation
    if (result.shouldEscalate) {
      // Switch conversation to HUMAN_HANDLING
      await sql`
        UPDATE conversations
        SET 
          handling_mode = 'HUMAN_HANDLING',
          escalation_reason = ${result.escalationReason || 'AI Escalation'},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${conversationId}
      `;

      // Record activity in contact timeline if contact exists
      const targetContactId = contactId || conv.contact_id;
      if (targetContactId) {
        await sql`
          INSERT INTO contact_activities (
            workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
          )
          VALUES (
            ${workspaceId}, ${projectId}, ${targetContactId}, 'CONVERSATION_ASSIGNED',
            NULL, 'AI System',
            ${`Escalated to human: ${result.escalationReason || 'Automatic handoff'}`},
            ${JSON.stringify({ conversationId, reason: result.escalationReason })}
          )
        `;
      }

      // Publish realtime escalation events
      await publishAiEvent({
        workspaceId,
        projectId,
        event: 'ai.escalated',
        data: {
          conversationId,
          reason: result.escalationReason,
        },
      });

      await publishInboxEvent({
        workspaceId,
        projectId,
        event: 'conversation.updated',
        data: {
          conversationId,
          handlingMode: 'HUMAN_HANDLING',
          escalationReason: result.escalationReason,
        },
      });

      // Send escalation message to customer if configured
      if (result.response) {
        await inboxService.sendOutboundMessage({
          workspaceId,
          projectId,
          conversationId,
          content: result.response,
          userId: '00000000-0000-0000-0000-000000000000', // AI system actor
          idempotencyKey: `ai-esc-${messageId}`,
        });
      }

      return {
        success: true,
        shouldEscalate: true,
        response: result.response,
        reason: result.escalationReason,
      };
    }

    // 4. Send Normal AI Response via Outbound WhatsApp Queue
    if (result.response) {
      await inboxService.sendOutboundMessage({
        workspaceId,
        projectId,
        conversationId,
        content: result.response,
        userId: '00000000-0000-0000-0000-000000000000', // AI system actor
        idempotencyKey: `ai-reply-${messageId}`,
      });

      // Record AI_REPLY in contact activities
      const targetContactId = contactId || conv.contact_id;
      if (targetContactId) {
        await sql`
          INSERT INTO contact_activities (
            workspace_id, project_id, contact_id, type, actor_id, actor_name, description, metadata
          )
          VALUES (
            ${workspaceId}, ${projectId}, ${targetContactId}, 'AI_REPLY',
            NULL, 'AI Agent',
            ${`AI replied: "${result.response.slice(0, 60)}${result.response.length > 60 ? '...' : ''}"`},
            ${JSON.stringify({
              conversationId,
              model: result.model,
              provider: result.provider,
              latencyMs: result.latencyMs,
            })}
          )
        `;
      }

      // Publish realtime response event
      await publishAiEvent({
        workspaceId,
        projectId,
        event: 'ai.response',
        data: {
          conversationId,
          model: result.model,
          latencyMs: result.latencyMs,
        },
      });
    }

    return {
      success: true,
      shouldEscalate: false,
      response: result.response,
    };
  } catch (err: any) {
    console.error('[AIWorker] Error processing AI job:', err);
    await publishAiEvent({
      workspaceId,
      projectId,
      event: 'ai.error',
      data: {
        conversationId,
        error: err?.message || 'AI processing failure',
      },
    });
    return { success: false, error: err?.message };
  }
}

let aiWorkerInstance: Worker<AIMessageJobData> | null = null;

export function startAiWorker(): Worker<AIMessageJobData> | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (aiWorkerInstance) {
    return aiWorkerInstance;
  }

  const redisOptions = getRedisOptions();
  aiWorkerInstance = new Worker<AIMessageJobData>(
    AI_MESSAGE_QUEUE_NAME,
    async (job: Job<AIMessageJobData>) => {
      return await processAiJob(job.data);
    },
    {
      connection: redisOptions,
      concurrency: 5,
    },
  );

  return aiWorkerInstance;
}
