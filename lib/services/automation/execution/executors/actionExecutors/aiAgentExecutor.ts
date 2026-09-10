import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { AIOrchestrator } from '@/lib/ai/aiOrchestrator';
import { AIProviderFactory } from '@/lib/ai/providers/aiProviderFactory';
import { ConversationContextBuilder } from '@/lib/ai/contextBuilder';
import { executionObservability } from '../../executionObservability';

export class AiAgentExecutor implements ActionNodeExecutor {
  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const config = node.configuration || {};
    const { workspaceId, projectId, executionId, conversationId } = context;

    const agentId = config.agentId || config.aiAgentId;
    if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_NODE_CONFIGURATION',
        errorMessage: 'AI Agent node requires a valid agentId configuration.',
      };
    }

    try {
      await ensureCoreTables();

      // 1. Verify and load Agent strictly scoped to workspaceId + projectId
      const { rows: agentRows } = await sql`
        SELECT 
          a.id as agent_id, a.name, a.status, a.handling_mode, a.current_version_id,
          v.id as version_id, v.version_number, v.role, v.system_instructions,
          v.tone, v.language, v.greeting_message, v.fallback_message,
          v.response_behavior, v.escalation_enabled, v.escalation_message,
          v.escalation_conditions, v.max_response_length, v.temperature,
          v.model, v.provider, v.configuration
        FROM ai_agents a
        LEFT JOIN ai_agent_versions v ON a.current_version_id = v.id
        WHERE a.id = ${agentId.trim()}
          AND a.workspace_id = ${workspaceId}
          AND a.project_id = ${projectId}
        LIMIT 1
      `;

      if (agentRows.length === 0) {
        return {
          status: 'FAILED',
          errorCode: 'AGENT_NOT_FOUND',
          errorMessage: `AI Agent "${agentId}" not found or does not belong to this project.`,
        };
      }

      const agent = agentRows[0];

      // 2. Lifecycle integrity: only ACTIVE agents with a published version can execute
      if (agent.status !== 'ACTIVE') {
        return {
          status: 'FAILED',
          errorCode: 'AGENT_NOT_ACTIVE',
          errorMessage: `AI Agent "${agent.name}" has status "${agent.status}". Only ACTIVE agents can execute in production automations.`,
        };
      }

      if (!agent.version_id) {
        return {
          status: 'FAILED',
          errorCode: 'AGENT_NOT_ACTIVE',
          errorMessage: `AI Agent "${agent.name}" does not have an active published version.`,
        };
      }

      // 3. Human Handling Mode Policy: Respect human handling if conversation is currently in HUMAN_HANDLING
      if (conversationId) {
        const { rows: convRows } = await sql`
          SELECT handling_mode, status, assigned_user_id
          FROM conversations
          WHERE id = ${conversationId}
            AND workspace_id = ${workspaceId}
            AND project_id = ${projectId}
          LIMIT 1
        `;

        if (convRows.length > 0) {
          const conv = convRows[0];
          if (conv.handling_mode === 'HUMAN_HANDLING') {
            await executionObservability.log({
              action: 'automation.ai.completed',
              workspaceId,
              projectId,
              automationId: context.automationId,
              executionId,
              nodeId: node.id,
              nodeType: node.type,
              status: 'SKIPPED',
              reason: 'Conversation is currently in HUMAN_HANDLING mode.',
            });

            return {
              status: 'COMPLETED',
              output: {
                action: 'AI_AGENT',
                responseGenerated: false,
                skipped: true,
                reason: 'Conversation is in HUMAN_HANDLING mode. Automated AI agent response suppressed.',
                shouldEscalate: true,
                escalationReason: 'Conversation assigned to human agent.',
              },
            };
          }
        }
      }

      // 4. Resolve Conversation History Context
      let contextMessages: any[] = [];
      let contactDetails: any = undefined;

      if (conversationId) {
        const convContext = await ConversationContextBuilder.buildContext({
          workspaceId,
          projectId,
          conversationId,
          maxRecentMessages: 10,
        });
        contextMessages = convContext.messages;
        contactDetails = convContext.contactDetails;
      }

      // 5. Resolve Triggering / Current Message
      const lastUserMessage =
        context.variables?.message?.body ||
        context.variables?.body ||
        context.variables?.lastUserMessage ||
        [...contextMessages].reverse().find((m) => m.role === 'user')?.content ||
        '';

      // 6. Escalation Triggers Check (Step 7 logic)
      if (agent.escalation_enabled && lastUserMessage) {
        const escalationCheck = AIOrchestrator.checkEscalationTriggers(
          lastUserMessage,
          agent.escalation_conditions || []
        );

        if (escalationCheck.shouldEscalate) {
          const escalationReply =
            agent.escalation_message ||
            'I am connecting you with a team member who can help you further.';

          // Record usage with status ESCALATED
          await sql`
            INSERT INTO ai_usage (
              workspace_id, project_id, agent_id, agent_version_id, conversation_id,
              provider, model, input_tokens, output_tokens, total_tokens, latency_ms,
              status, source, metadata
            )
            VALUES (
              ${workspaceId}, ${projectId}, ${agent.agent_id}, ${agent.version_id}, ${conversationId || null},
              ${agent.provider || 'openai'}, ${agent.model || 'gpt-4o-mini'}, 0, 0, 0,
              ${Date.now() - startTime}, 'ESCALATED', 'AUTOMATION',
              ${JSON.stringify({ automationId: context.automationId, executionId, nodeId: node.id })}
            )
          `.catch((): null => null);

          await executionObservability.log({
            action: 'automation.ai.escalated',
            workspaceId,
            projectId,
            automationId: context.automationId,
            executionId,
            nodeId: node.id,
            nodeType: node.type,
            reason: escalationCheck.reason,
            durationMs: Date.now() - startTime,
          });

          return {
            status: 'COMPLETED',
            output: {
              action: 'AI_AGENT',
              responseGenerated: true,
              response: escalationReply,
              shouldEscalate: true,
              escalationReason: escalationCheck.reason,
              provider: agent.provider || 'openai',
              model: agent.model || 'gpt-4o-mini',
              latencyMs: Date.now() - startTime,
              sourceCount: 0,
              sources: [],
            },
          };
        }
      }

      // 7. Knowledge / RAG Retrieval (Step 8 integration)
      const useKnowledge = config.useKnowledge !== false;
      let knowledgeSnippet = '';
      let safeSources: Array<{ id: string; title: string }> = [];

      if (useKnowledge && lastUserMessage) {
        const knowledgeResult = await ConversationContextBuilder.retrieveKnowledgeWithCitations(
          lastUserMessage,
          agent.agent_id,
          workspaceId,
          projectId
        );
        knowledgeSnippet = knowledgeResult.knowledgeSnippet;
        safeSources = (knowledgeResult.sources || []).map((s) => ({
          id: s.sourceId || s.documentId,
          title: s.title || 'Knowledge Base Document',
        }));
      }

      // 8. Build System Prompt with optional runtime task instruction
      let systemPrompt = AIOrchestrator.formatSystemPrompt({
        role: agent.role,
        systemInstructions: agent.system_instructions,
        tone: agent.tone,
        language: agent.language,
        customerName: contactDetails?.name,
        customerCompany: contactDetails?.company,
        knowledgeContext: knowledgeSnippet,
        maxResponseLength: agent.max_response_length || 300,
      });

      // Runtime task instruction override: append without overriding core policy
      if (config.instruction && typeof config.instruction === 'string' && config.instruction.trim()) {
        systemPrompt += `\n\nSpecific Workflow Task Instruction:\n${config.instruction.trim()}`;
      }

      // 9. Call Central AI Provider Abstraction
      const provider = AIProviderFactory.getProvider(agent.provider || 'openai');
      const completion = await provider.generateResponse({
        systemPrompt,
        messages: contextMessages.length > 0 ? contextMessages : (lastUserMessage ? [{ role: 'user', content: lastUserMessage }] : []),
        model: agent.model || 'gpt-4o-mini',
        temperature: Number(agent.temperature) || 0.3,
        maxTokens: agent.max_response_length || 300,
      });

      let finalResponse = completion.content?.trim();
      if (!finalResponse) {
        finalResponse = agent.fallback_message || "I apologize, I'm currently unable to respond. Please try again shortly.";
      }

      const latencyMs = completion.latencyMs || (Date.now() - startTime);

      // 10. Record AI Usage in Step 7 table with source = 'AUTOMATION'
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, agent_id, agent_version_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms,
          status, source, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${agent.agent_id}, ${agent.version_id}, ${conversationId || null},
          ${completion.provider}, ${completion.model},
          ${completion.usage.promptTokens}, ${completion.usage.completionTokens}, ${completion.usage.totalTokens},
          ${latencyMs}, ${'SUCCESS'}, ${'AUTOMATION'},
          ${JSON.stringify({ automationId: context.automationId, executionId, nodeId: node.id })}
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
        provider: completion.provider,
        model: completion.model,
        latencyMs,
        durationMs: Date.now() - startTime,
      });

      return {
        status: 'COMPLETED',
        output: {
          action: 'AI_AGENT',
          responseGenerated: true,
          response: finalResponse,
          shouldEscalate: false,
          provider: completion.provider,
          model: completion.model,
          latencyMs,
          sourceCount: safeSources.length,
          sources: safeSources,
          usage: completion.usage,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = String(err?.message || 'Unknown provider failure');

      // Record failed usage
      await sql`
        INSERT INTO ai_usage (
          workspace_id, project_id, agent_id, agent_version_id, conversation_id,
          provider, model, input_tokens, output_tokens, total_tokens, latency_ms,
          status, error_code, source, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${agentId}, NULL, ${conversationId || null},
          'openai', 'unknown', 0, 0, 0,
          ${latencyMs}, 'FAILED', ${errMsg.slice(0, 100)}, 'AUTOMATION',
          ${JSON.stringify({ automationId: context.automationId, executionId, nodeId: node.id })}
        )
      `.catch((): null => null);

      // Classify error: transient vs permanent
      let errorCode = 'AI_PROVIDER_UNAVAILABLE';
      if (/timeout|timed out|abort/i.test(errMsg)) {
        errorCode = 'AI_TIMEOUT';
      } else if (/rate limit|too many requests|429/i.test(errMsg)) {
        errorCode = 'AI_RATE_LIMITED';
      } else if (/not configured|configuration/i.test(errMsg)) {
        errorCode = 'AI_CONFIGURATION_ERROR';
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
        errorMessage: `AI Agent execution failed: ${errMsg}`,
      };
    }
  }
}
