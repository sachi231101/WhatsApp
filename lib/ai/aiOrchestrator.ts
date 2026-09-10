import { sql } from '@/lib/db';
import { AIProviderFactory } from './providers/aiProviderFactory';
import { AIMessage } from './providers/types';
import { ConversationContextBuilder } from './contextBuilder';

export interface AIOrchestratorResult {
  response: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    inputTokens?: number;
    outputTokens?: number;
  };
  provider: string;
  model: string;
  latencyMs: number;
  agentId?: string;
  versionNumber?: number;
  sources?: Array<{
    sourceId: string;
    documentId: string;
    title: string;
    score: number;
  }>;
}

export interface OrchestratorInput {
  workspaceId: string;
  projectId: string;
  conversationId: string;
  lastUserMessage: string;
}

export interface TestAgentInput {
  workspaceId: string;
  projectId: string;
  agentId: string;
  message?: string;
  messages?: AIMessage[];
  draftOverride?: {
    role?: string;
    systemInstructions?: string;
    tone?: string;
    language?: string;
    greetingMessage?: string;
    fallbackMessage?: string;
    escalationEnabled?: boolean;
    escalationMessage?: string;
    escalationConditions?: any[];
    maxResponseLength?: number;
    temperature?: number;
    model?: string;
    provider?: string;
  };
}

export class AIOrchestrator {
  /**
   * Human Escalation Detection keywords & phrases
   */
  private static readonly HUMAN_INTENT_PATTERNS = [
    /\b(talk|speak)\s+to\s+(a\s+)?(human|person|agent|representative|manager)\b/i,
    /\b(human|person|agent|representative)\s+please\b/i,
    /\btransfer\s+me\b/i,
    /\bconnect\s+me\s+to\s+(a\s+)?(human|person|agent)\b/i,
    /\bwant\s+to\s+(talk|speak)\s+with\s+(a\s+)?(human|person|agent)\b/i,
    /\bstop\s+bot\b/i,
  ];

  /**
   * Evaluates whether user message matches built-in or configured escalation conditions.
   */
  static checkEscalationTriggers(
    messageText: string,
    configuredConditions: any[] = [],
  ): { shouldEscalate: boolean; reason?: string } {
    const text = messageText.trim();

    // 1. Built-in human intent detection
    for (const pattern of this.HUMAN_INTENT_PATTERNS) {
      if (pattern.test(text)) {
        return {
          shouldEscalate: true,
          reason: 'Customer explicitly requested to speak with a human agent.',
        };
      }
    }

    // 2. Configured escalation rules (keywords / conditions)
    if (Array.isArray(configuredConditions)) {
      for (const cond of configuredConditions) {
        if (typeof cond === 'string' && cond.trim()) {
          const regex = new RegExp(`\\b${cond.trim()}\\b`, 'i');
          if (regex.test(text)) {
            return {
              shouldEscalate: true,
              reason: `Matched escalation condition: "${cond}"`,
            };
          }
        } else if (cond && typeof cond === 'object' && cond.keyword) {
          const regex = new RegExp(`\\b${cond.keyword.trim()}\\b`, 'i');
          if (regex.test(text)) {
            return {
              shouldEscalate: true,
              reason: cond.description || `Matched escalation keyword: "${cond.keyword}"`,
            };
          }
        }
      }
    }

    return { shouldEscalate: false };
  }

  /**
   * Formats the prompt combining role, instructions, tone, and customer details.
   */
  static formatSystemPrompt(opts: {
    role: string;
    systemInstructions: string;
    tone?: string;
    language?: string;
    customerName?: string;
    customerCompany?: string | null;
    knowledgeContext?: string;
    maxResponseLength?: number;
  }): string {
    const parts: string[] = [];

    parts.push(`You are an AI Agent for Wazzi. Your primary role: ${opts.role}.`);
    parts.push(`Core Instructions:\n${opts.systemInstructions}`);

    if (opts.tone) {
      parts.push(`Tone: Maintain a ${opts.tone} tone throughout the conversation.`);
    }

    if (opts.language && opts.language !== 'English') {
      parts.push(`Primary Language: Respond in ${opts.language} unless the customer uses another language.`);
    }

    if (opts.customerName && opts.customerName !== 'Customer') {
      parts.push(`Customer Context: You are speaking with ${opts.customerName}${opts.customerCompany ? ` from ${opts.customerCompany}` : ''}.`);
    }

    if (opts.knowledgeContext && opts.knowledgeContext.trim()) {
      parts.push(`Knowledge Base Context:\n${opts.knowledgeContext}`);
    }

    if (opts.maxResponseLength) {
      parts.push(`Length Constraint: Keep your responses concise, within approximately ${opts.maxResponseLength} words/tokens.`);
    }

    parts.push('Formatting: Write clean, readable WhatsApp-friendly text. Avoid Markdown tables or heavy code blocks unless asked.');

    return parts.join('\n\n');
  }

  /**
   * Handles inbound customer message in the production message pipeline.
   */
  static async handleInboundMessage(input: OrchestratorInput): Promise<AIOrchestratorResult | null> {
    const { workspaceId, projectId, conversationId, lastUserMessage } = input;

    // 1. Fetch active AI Agent for this project
    const { rows: agentRows } = await sql`
      SELECT 
        a.id as agent_id, a.name, a.status, a.handling_mode, a.current_version_id,
        v.id as version_id, v.version_number, v.role, v.system_instructions,
        v.tone, v.language, v.greeting_message, v.fallback_message,
        v.response_behavior, v.escalation_enabled, v.escalation_message,
        v.escalation_conditions, v.max_response_length, v.temperature,
        v.model, v.provider, v.configuration
      FROM ai_agents a
      JOIN ai_agent_versions v ON a.current_version_id = v.id
      WHERE a.project_id = ${projectId}
        AND a.workspace_id = ${workspaceId}
        AND a.status = 'ACTIVE'
      LIMIT 1
    `;

    if (agentRows.length === 0) {
      return null;
    }

    const agent = agentRows[0];
    const startTime = Date.now();

    // 2. Check escalation triggers before calling AI
    if (agent.escalation_enabled) {
      const escalationCheck = this.checkEscalationTriggers(
        lastUserMessage,
        agent.escalation_conditions,
      );

      if (escalationCheck.shouldEscalate) {
        const escalationReply = agent.escalation_message || 'I am connecting you with a team member who can help you further.';
        
        // Record usage log
        await sql`
          INSERT INTO ai_usage (
            workspace_id, project_id, agent_id, agent_version_id, conversation_id,
            provider, model, input_tokens, output_tokens, total_tokens, latency_ms, status
          )
          VALUES (
            ${workspaceId}, ${projectId}, ${agent.agent_id}, ${agent.version_id}, ${conversationId},
            ${agent.provider || 'openai'}, ${agent.model || 'gpt-4o-mini'}, 0, 0, 0,
            ${Date.now() - startTime}, 'ESCALATED'
          )
        `;

        return {
          response: escalationReply,
          shouldEscalate: true,
          escalationReason: escalationCheck.reason,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          provider: agent.provider || 'openai',
          model: agent.model || 'gpt-4o-mini',
          latencyMs: Date.now() - startTime,
          agentId: agent.agent_id,
          versionNumber: agent.version_number,
        };
      }
    }

    // 3. Build Conversation Context
    const context = await ConversationContextBuilder.buildContext({
      workspaceId,
      projectId,
      conversationId,
      maxRecentMessages: 10,
    });

    const knowledgeResult = await ConversationContextBuilder.retrieveKnowledgeWithCitations(
      lastUserMessage,
      agent.agent_id,
      workspaceId,
      projectId,
    );

    const systemPrompt = this.formatSystemPrompt({
      role: agent.role,
      systemInstructions: agent.system_instructions,
      tone: agent.tone,
      language: agent.language,
      customerName: context.contactDetails?.name,
      customerCompany: context.contactDetails?.company,
      knowledgeContext: knowledgeResult.knowledgeSnippet,
      maxResponseLength: agent.max_response_length || 300,
    });

    // 4. Invoke Provider
    try {
      const provider = AIProviderFactory.getProvider(agent.provider || 'openai');
      const completion = await provider.generateResponse({
        systemPrompt,
        messages: context.messages,
        model: agent.model || 'gpt-4o-mini',
        temperature: Number(agent.temperature) || 0.3,
        maxTokens: agent.max_response_length || 300,
      });

      // Guardrail: Fallback if response is empty
      let finalResponse = completion.content;
      if (!finalResponse || !finalResponse.trim()) {
        finalResponse = agent.fallback_message || "I apologize, I didn't quite catch that. Could you please rephrase?";
      }

      // Record successful AI usage
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, agent_id, agent_version_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms, status
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${agent.agent_id}, ${agent.version_id}, ${conversationId},
          ${completion.provider}, ${completion.model},
          ${completion.usage.promptTokens}, ${completion.usage.completionTokens}, ${completion.usage.totalTokens},
          ${completion.latencyMs}, 'SUCCESS'
        )
      `;

      return {
        response: finalResponse,
        shouldEscalate: false,
        usage: completion.usage,
        provider: completion.provider,
        model: completion.model,
        latencyMs: completion.latencyMs,
        agentId: agent.agent_id,
        versionNumber: agent.version_number,
        sources: knowledgeResult.sources,
      };
    } catch (providerErr: any) {
      console.error('[AIOrchestrator] Provider execution error:', providerErr);
      const latencyMs = Date.now() - startTime;

      // Record failed usage
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, agent_id, agent_version_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms, status, error_code
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${agent.agent_id}, ${agent.version_id}, ${conversationId},
          ${agent.provider || 'openai'}, ${agent.model || 'gpt-4o-mini'}, 0, 0, 0,
          ${latencyMs}, 'FAILED', ${String(providerErr?.message || 'PROVIDER_ERROR').slice(0, 100)}
        )
      `;

      // If escalation enabled on error, trigger escalation
      if (agent.escalation_enabled) {
        return {
          response: agent.escalation_message || 'I am having trouble answering right now. Connecting you with an agent.',
          shouldEscalate: true,
          escalationReason: 'Provider failure or timeout.',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          provider: agent.provider || 'openai',
          model: agent.model || 'gpt-4o-mini',
          latencyMs,
          agentId: agent.agent_id,
          versionNumber: agent.version_number,
          sources: knowledgeResult.sources,
        };
      }

      return {
        response: agent.fallback_message || "I apologize, I'm currently unable to respond. Please try again shortly.",
        shouldEscalate: false,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        provider: agent.provider || 'openai',
        model: agent.model || 'gpt-4o-mini',
        latencyMs,
        agentId: agent.agent_id,
        versionNumber: agent.version_number,
        sources: knowledgeResult.sources,
      };
    }
  }

  /**
   * Tests an agent in the Playground without sending WhatsApp messages or creating customer conversations.
   */
  static async testAgent(input: TestAgentInput): Promise<AIOrchestratorResult> {
    const { workspaceId, projectId, agentId, draftOverride } = input;
    const startTime = Date.now();

    // 1. Fetch agent and current draft/published version if agentId is provided
    let row: any = null;
    if (agentId && agentId !== 'preview') {
      const { rows: agentRows } = await sql`
        SELECT 
          a.id, a.name, a.status, a.current_version_id,
          v.role, v.system_instructions, v.tone, v.language,
          v.greeting_message, v.fallback_message, v.escalation_enabled,
          v.escalation_message, v.escalation_conditions, v.max_response_length,
          v.temperature, v.model, v.provider
        FROM ai_agents a
        LEFT JOIN ai_agent_versions v ON (
          v.agent_id = a.id AND (v.id = a.current_version_id OR v.status = 'DRAFT')
        )
        WHERE a.id = ${agentId}
          AND a.workspace_id = ${workspaceId}
          AND a.project_id = ${projectId}
        ORDER BY v.version_number DESC
        LIMIT 1
      `;

      if (agentRows.length === 0) {
        if (!draftOverride) {
          throw new Error('Agent not found or access denied');
        }
      } else {
        row = agentRows[0];
      }
    }

    const role = draftOverride?.role || row?.role || 'Assistant';
    const systemInstructions = draftOverride?.systemInstructions || row?.system_instructions || 'Answer helpful customer questions.';
    const tone = draftOverride?.tone || row?.tone || 'Professional';
    const language = draftOverride?.language || row?.language || 'English';
    const fallbackMessage = draftOverride?.fallbackMessage || row?.fallback_message || "I'm sorry, I cannot process that request right now.";
    const escalationEnabled = draftOverride?.escalationEnabled !== undefined ? draftOverride.escalationEnabled : (row?.escalation_enabled ?? true);
    const escalationMessage = draftOverride?.escalationMessage || row?.escalation_message || 'Connecting you to a human agent.';
    const escalationConditions = draftOverride?.escalationConditions || row?.escalation_conditions || [];
    const maxTokens = draftOverride?.maxResponseLength || row?.max_response_length || 300;
    const temperature = draftOverride?.temperature !== undefined ? Number(draftOverride.temperature) : Number(row?.temperature || 0.3);
    const model = draftOverride?.model || row?.model || 'gpt-4o-mini';
    const providerName = draftOverride?.provider || row?.provider || 'openai';

    const inputMessages = input.messages || (input.message ? [{ role: 'user' as const, content: input.message }] : []);
    const lastUserMsg = [...inputMessages].reverse().find((m) => m.role === 'user')?.content || '';

    // 2. Check escalation
    if (escalationEnabled && lastUserMsg) {
      const esc = this.checkEscalationTriggers(lastUserMsg, escalationConditions);
      if (esc.shouldEscalate) {
        return {
          response: escalationMessage,
          shouldEscalate: true,
          escalationReason: esc.reason,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 },
          provider: providerName,
          model,
          latencyMs: Date.now() - startTime,
          agentId,
        };
      }
    }

    let knowledgeSnippet = '';
    let testSources: any[] = [];
    if (agentId && agentId !== 'preview' && lastUserMsg) {
      const kRes = await ConversationContextBuilder.retrieveKnowledgeWithCitations(
        lastUserMsg,
        agentId,
        workspaceId,
        projectId,
      );
      knowledgeSnippet = kRes.knowledgeSnippet;
      testSources = kRes.sources;
    }

    const systemPrompt = this.formatSystemPrompt({
      role,
      systemInstructions,
      tone,
      language,
      knowledgeContext: knowledgeSnippet,
      maxResponseLength: maxTokens,
    });

    // 3. Call AI provider
    try {
      const provider = AIProviderFactory.getProvider(providerName);
      const completion = await provider.generateResponse({
        systemPrompt,
        messages: inputMessages,
        model,
        temperature,
        maxTokens,
      });

      const enrichedUsage = {
        promptTokens: completion.usage?.promptTokens || 0,
        completionTokens: completion.usage?.completionTokens || 0,
        totalTokens: completion.usage?.totalTokens || 0,
        inputTokens: completion.usage?.promptTokens || 0,
        outputTokens: completion.usage?.completionTokens || 0,
      };

      // Record usage in ai_usage if real agent is being tested
      if (agentId && agentId !== 'preview' && row) {
        await sql`
          INSERT INTO ai_usage (
            workspace_id, project_id, agent_id, agent_version_id, conversation_id,
            provider, model, input_tokens, output_tokens, total_tokens,
            latency_ms, status
          )
          VALUES (
            ${workspaceId}, ${projectId}, ${agentId}, ${row.current_version_id || null}, NULL,
            ${completion.provider || providerName}, ${completion.model || model},
            ${enrichedUsage.promptTokens}, ${enrichedUsage.completionTokens}, ${enrichedUsage.totalTokens},
            ${completion.latencyMs || Date.now() - startTime}, ${'SUCCESS'}
          )
        `.catch((): null => null);
      }

      return {
        response: completion.content || fallbackMessage,
        shouldEscalate: false,
        usage: enrichedUsage,
        provider: completion.provider,
        model: completion.model,
        latencyMs: completion.latencyMs,
        agentId,
        sources: testSources,
      };
    } catch (err: any) {
      if (err?.message === 'AI provider is not configured.') {
        throw err;
      }

      if (escalationEnabled) {
        return {
          response: escalationMessage,
          shouldEscalate: true,
          escalationReason: `Provider error: ${err?.message}`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 },
          provider: providerName,
          model,
          latencyMs: Date.now() - startTime,
          agentId,
        };
      }
      return {
        response: fallbackMessage,
        shouldEscalate: false,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 },
        provider: providerName,
        model,
        latencyMs: Date.now() - startTime,
        agentId,
      };
    }
  }
}
