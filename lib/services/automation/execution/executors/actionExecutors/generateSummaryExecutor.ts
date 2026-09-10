import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { AIProviderFactory } from '@/lib/ai/providers/aiProviderFactory';
import { ConversationContextBuilder } from '@/lib/ai/contextBuilder';
import { executionObservability } from '../../executionObservability';

export class GenerateSummaryExecutor implements ActionNodeExecutor {
  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const config = node.configuration || {};
    const { workspaceId, projectId, executionId, conversationId } = context;

    try {
      await ensureCoreTables();

      // 1. Resolve Conversation Messages
      let messages: any[] = [];
      let contactName = 'Customer';

      if (conversationId) {
        const maxMsgs = config.scope === 'all' ? 20 : 10;
        const convContext = await ConversationContextBuilder.buildContext({
          workspaceId,
          projectId,
          conversationId,
          maxRecentMessages: maxMsgs,
        });
        messages = convContext.messages;
        if (convContext.contactDetails?.name) {
          contactName = convContext.contactDetails.name;
        }
      }

      // If empty conversation, return a safe internal fallback summary
      if (messages.length === 0) {
        const fallbackSummary = `No recent conversation history available to summarize for ${contactName}.`;
        return {
          status: 'COMPLETED',
          output: {
            action: 'GENERATE_SUMMARY',
            summary: fallbackSummary,
            latencyMs: Date.now() - startTime,
          },
        };
      }

      // 2. Build Bounded Summarization System Prompt
      const maxTokens = config.summaryLength === 'DETAILED' ? 300 : 150;
      const promptParts = [
        'You are an internal CRM conversation summarizer for a WhatsApp Business platform.',
        `Summarize the recent WhatsApp dialogue between the business and ${contactName}.`,
        'Highlight the customer\'s key interest, needs, specific details mentioned, and any pending questions.',
        'Keep the summary concise, objective, and well-structured.',
      ];

      if (config.focus && typeof config.focus === 'string' && config.focus.trim()) {
        promptParts.push(`Focus especially on: ${config.focus.trim()}`);
      }

      promptParts.push(`Keep the total output under ${maxTokens} words.`);

      const systemPrompt = promptParts.join('\n');

      // 3. Call AI Provider
      const provider = AIProviderFactory.getProvider('openai');
      const completion = await provider.generateResponse({
        systemPrompt,
        messages,
        temperature: 0.2,
        maxTokens,
      });

      const summary = completion.content?.trim() || `Customer engaged in conversation with ${messages.length} recent messages.`;
      const latencyMs = completion.latencyMs || (Date.now() - startTime);

      // 4. Record Usage in Step 7 ai_usage
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms,
          status, source, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${conversationId || null},
          ${completion.provider}, ${completion.model},
          ${completion.usage.promptTokens}, ${completion.usage.completionTokens}, ${completion.usage.totalTokens},
          ${latencyMs}, 'SUCCESS', 'AUTOMATION',
          ${JSON.stringify({ automationId: context.automationId, executionId, nodeId: node.id, action: 'GENERATE_SUMMARY' })}
        )
      `.catch((): null => null);

      await executionObservability.log({
        action: 'automation.ai.completed',
        workspaceId,
        projectId,
        automationId: context.automationId,
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        summaryLength: summary.length,
        durationMs: latencyMs,
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'GENERATE_SUMMARY',
          summary,
          latencyMs,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = String(err?.message || 'Unknown summarization error');

      let errorCode = 'AI_PROVIDER_UNAVAILABLE';
      if (/timeout|abort/i.test(errMsg)) {
        errorCode = 'AI_TIMEOUT';
      } else if (/rate limit|429/i.test(errMsg)) {
        errorCode = 'AI_RATE_LIMITED';
      }

      await executionObservability.log({
        action: 'automation.ai.failed',
        workspaceId,
        projectId,
        automationId: context.automationId,
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        errorCode,
        errorMessage: errMsg,
        durationMs: latencyMs,
      });

      return {
        status: 'FAILED',
        errorCode,
        errorMessage: `Generate Summary execution failed: ${errMsg}`,
      };
    }
  }
}
