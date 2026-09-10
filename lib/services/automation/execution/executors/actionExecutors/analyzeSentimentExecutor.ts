import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { AIProviderFactory } from '@/lib/ai/providers/aiProviderFactory';
import { ConversationContextBuilder } from '@/lib/ai/contextBuilder';
import { executionObservability } from '../../executionObservability';

const ALLOWED_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as const;
type SentimentType = (typeof ALLOWED_SENTIMENTS)[number];

export class AnalyzeSentimentExecutor implements ActionNodeExecutor {
  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const config = node.configuration || {};
    const { workspaceId, projectId, executionId, conversationId } = context;

    try {
      await ensureCoreTables();

      // 1. Resolve Text to Analyze (Current Message or Recent Conversation)
      let textToAnalyze = '';

      if (config.source === 'conversation' && conversationId) {
        const convContext = await ConversationContextBuilder.buildContext({
          workspaceId,
          projectId,
          conversationId,
          maxRecentMessages: 6,
        });

        if (convContext.messages.length > 0) {
          textToAnalyze = convContext.messages
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');
        }
      }

      if (!textToAnalyze) {
        textToAnalyze =
          context.variables?.message?.body ||
          context.variables?.body ||
          context.variables?.lastUserMessage ||
          '';

        if (!textToAnalyze && conversationId) {
          const convContext = await ConversationContextBuilder.buildContext({
            workspaceId,
            projectId,
            conversationId,
            maxRecentMessages: 3,
          });
          const lastMsg = [...convContext.messages].reverse().find((m) => m.role === 'user');
          if (lastMsg) {
            textToAnalyze = lastMsg.content;
          }
        }
      }

      if (!textToAnalyze || !textToAnalyze.trim()) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_CONFIGURATION',
          errorMessage: 'No message or conversation text available to analyze sentiment.',
        };
      }

      // 2. Build Structured Prompt
      const systemPrompt = [
        'You are a high-precision sentiment analysis engine for a WhatsApp Business platform.',
        'Analyze the sentiment of the customer message or conversation and respond with ONLY a strict JSON object:',
        '{',
        '  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED",',
        '  "confidence": 0.0 to 1.0',
        '}',
        'Rules:',
        '1. The "sentiment" field must be exactly one of: POSITIVE, NEUTRAL, NEGATIVE, MIXED.',
        '2. The "confidence" field must be a number between 0.0 and 1.0.',
        '3. Do not include Markdown blocks or explanation outside the JSON object.',
      ].join('\n');

      // 3. Call Central AI Provider with JSON output format
      const provider = AIProviderFactory.getProvider('openai');
      const completion = await provider.generateStructuredOutput<{
        sentiment?: string;
        confidence?: number;
      }>({
        systemPrompt,
        messages: [{ role: 'user', content: textToAnalyze.slice(0, 2000) }],
        responseFormat: 'json',
        temperature: 0.1,
        maxTokens: 100,
      });

      const parsedData = completion.data;
      const rawSentiment = String(parsedData?.sentiment || '').toUpperCase().trim();
      const rawConfidence = Number(parsedData?.confidence);

      // 4. Strict Schema & Enum Validation
      if (!ALLOWED_SENTIMENTS.includes(rawSentiment as SentimentType)) {
        return {
          status: 'FAILED',
          errorCode: 'INVALID_OUTPUT_SCHEMA',
          errorMessage: `AI sentiment classification returned invalid sentiment value: "${rawSentiment}". Expected one of: ${ALLOWED_SENTIMENTS.join(', ')}.`,
        };
      }

      const normalizedSentiment = rawSentiment as SentimentType;
      const normalizedConfidence =
        !isNaN(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1
          ? Math.round(rawConfidence * 100) / 100
          : 0.9;

      const latencyMs = completion.raw.latencyMs || (Date.now() - startTime);

      // 5. Record Usage in Step 7 ai_usage table
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms,
          status, source, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${conversationId || null},
          ${completion.raw.provider}, ${completion.raw.model},
          ${completion.raw.usage.promptTokens}, ${completion.raw.usage.completionTokens}, ${completion.raw.usage.totalTokens},
          ${latencyMs}, 'SUCCESS', 'AUTOMATION',
          ${JSON.stringify({ automationId: context.automationId, executionId, nodeId: node.id, action: 'ANALYZE_SENTIMENT' })}
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
        sentiment: normalizedSentiment,
        confidence: normalizedConfidence,
        durationMs: latencyMs,
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'ANALYZE_SENTIMENT',
          sentiment: normalizedSentiment,
          confidence: normalizedConfidence,
          sentimentConfidence: normalizedConfidence,
          latencyMs,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = String(err?.message || 'Unknown sentiment analysis error');

      let errorCode = 'AI_PROVIDER_UNAVAILABLE';
      if (/timeout|abort/i.test(errMsg)) {
        errorCode = 'AI_TIMEOUT';
      } else if (/rate limit|429/i.test(errMsg)) {
        errorCode = 'AI_RATE_LIMITED';
      } else if (/parse|json/i.test(errMsg)) {
        errorCode = 'INVALID_OUTPUT_SCHEMA';
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
        errorMessage: `Analyze Sentiment execution failed: ${errMsg}`,
      };
    }
  }
}
