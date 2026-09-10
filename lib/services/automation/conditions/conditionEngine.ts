import {
  ConditionExecutionContext,
  ConditionEvaluationResult,
} from './types';
import { ConditionEvaluatorRegistry } from './evaluatorRegistry';
import { ConditionValidator } from './conditionValidator';
import { conditionObservability } from './conditionObservability';
import { ContactService } from '@/lib/services/contacts/contactService';
import { InboxService } from '@/lib/services/inbox/inboxService';
import { sql } from '@/lib/db';

const contactService = new ContactService();
const inboxService = new InboxService();

export interface AutomationConditionNodeInput {
  id?: string;
  nodeKey?: string;
  type?: string;
  nodeType?: string;
  definitionType?: string;
  configuration?: Record<string, any>;
  config?: Record<string, any>;
}

export class ConditionEngine {
  /**
   * Evaluates a single condition node against the normalized execution context.
   * Deterministically returns { matched: boolean, branch: 'YES' | 'NO', ... }
   */
  async evaluate(
    node: AutomationConditionNodeInput,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    const startTime = Date.now();
    const nodeId = node.id || node.nodeKey || 'unknown-node';

    // 1. Mandatory Tenant Isolation Check
    if (!context.workspaceId || !context.projectId) {
      const durationMs = Date.now() - startTime;
      const res: ConditionEvaluationResult = {
        matched: false,
        branch: 'NO',
        reason: 'Condition evaluation rejected: Missing workspaceId or projectId in execution context.',
        errorCode: 'TENANT_VIOLATION',
      };
      conditionObservability.log({
        action: 'condition.error',
        workspaceId: context.workspaceId || 'unknown',
        projectId: context.projectId || 'unknown',
        automationId: context.automationId,
        automationVersionId: context.automationVersionId,
        executionId: context.executionId,
        nodeId,
        conditionType: 'UNKNOWN',
        durationMs,
        errorCode: 'TENANT_VIOLATION',
        reason: res.reason,
      });
      return res;
    }

    // 2. Resolve Condition Type
    const rawType = node.definitionType || node.nodeType || node.type || '';
    const conditionType = rawType.toUpperCase().trim();

    // 3. Resolve Evaluator from Registry
    const evaluator = ConditionEvaluatorRegistry.get(conditionType);
    if (!evaluator) {
      const durationMs = Date.now() - startTime;
      const res: ConditionEvaluationResult = {
        matched: false,
        branch: 'NO',
        reason: `Unsupported condition node type: "${rawType}"`,
        errorCode: 'UNSUPPORTED_NODE_TYPE',
      };
      conditionObservability.log({
        action: 'condition.error',
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        automationId: context.automationId,
        automationVersionId: context.automationVersionId,
        executionId: context.executionId,
        nodeId,
        conditionType,
        durationMs,
        errorCode: 'UNSUPPORTED_NODE_TYPE',
        reason: res.reason,
      });
      return res;
    }

    // 4. Configuration Extraction & Runtime Validation
    const configuration = node.configuration || node.config || {};
    const validation = ConditionValidator.validate(conditionType, configuration);
    if (!validation.valid) {
      const durationMs = Date.now() - startTime;
      const res: ConditionEvaluationResult = {
        matched: false,
        branch: 'NO',
        reason: `Invalid condition configuration: ${validation.errors.join('; ')}`,
        errorCode: validation.errorCode || 'INVALID_CONFIGURATION',
      };
      conditionObservability.log({
        action: 'condition.error',
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        automationId: context.automationId,
        automationVersionId: context.automationVersionId,
        executionId: context.executionId,
        nodeId,
        conditionType,
        durationMs,
        errorCode: res.errorCode,
        reason: res.reason,
      });
      return res;
    }

    // 5. Lazy Context Resolution (load only what's needed, caching on context to prevent redundant DB calls)
    await this.hydrateContextIfNeeded(conditionType, context);

    // 6. Execute Evaluator
    try {
      const evaluationResult = await evaluator.evaluate(configuration, context);
      const durationMs = Date.now() - startTime;

      const finalResult: ConditionEvaluationResult & { durationMs: number } = {
        matched: evaluationResult.matched,
        branch: evaluationResult.matched ? 'YES' : 'NO',
        evaluatedValue: evaluationResult.evaluatedValue,
        operator: evaluationResult.operator,
        reason: evaluationResult.reason,
        metadata: evaluationResult.metadata,
        errorCode: evaluationResult.errorCode,
        durationMs,
      };

      conditionObservability.log({
        action: 'condition.evaluated',
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        automationId: context.automationId,
        automationVersionId: context.automationVersionId,
        executionId: context.executionId,
        nodeId,
        conditionType,
        matched: finalResult.matched,
        branch: finalResult.branch,
        operator: finalResult.operator,
        durationMs,
        errorCode: finalResult.errorCode,
        reason: finalResult.reason,
      });

      return finalResult;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const res: ConditionEvaluationResult = {
        matched: false,
        branch: 'NO',
        reason: `Condition evaluation encountered an internal error: ${err.message || String(err)}`,
        errorCode: 'DATA_ACCESS_ERROR',
      };

      conditionObservability.log({
        action: 'condition.error',
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        automationId: context.automationId,
        automationVersionId: context.automationVersionId,
        executionId: context.executionId,
        nodeId,
        conditionType,
        durationMs,
        errorCode: 'DATA_ACCESS_ERROR',
        reason: res.reason,
      });

      return res;
    }
  }

  /**
   * Safe preview/test helper for builder preview endpoints.
   */
  async preview(
    conditionType: string,
    configuration: Record<string, any>,
    context: ConditionExecutionContext
  ): Promise<ConditionEvaluationResult> {
    return this.evaluate(
      {
        id: 'preview-node',
        nodeType: conditionType,
        configuration,
      },
      context
    );
  }

  /**
   * Lazily loads necessary relational records into context if not already present.
   */
  private async hydrateContextIfNeeded(
    conditionType: string,
    context: ConditionExecutionContext
  ): Promise<void> {
    const { workspaceId, projectId } = context;

    // Contact hydration for CONTACT_TAG, LEAD_SCORE, CUSTOM_FIELD
    if (['CONTACT_TAG', 'LEAD_SCORE', 'CUSTOM_FIELD'].includes(conditionType)) {
      if (!context.contact && context.contactId) {
        try {
          const contact = await contactService.getContactById(workspaceId, projectId, context.contactId);
          if (contact) {
            context.contact = contact;
          }
        } catch {
          // Handled gracefully in individual evaluators
        }
      }
    }

    // Conversation hydration for CONVERSATION_STATUS, CONVERSATION_ASSIGNEE
    if (['CONVERSATION_STATUS', 'CONVERSATION_ASSIGNEE'].includes(conditionType)) {
      if (!context.conversation && context.conversationId) {
        try {
          const conversation = await inboxService.getConversationDetails(workspaceId, projectId, context.conversationId);
          if (conversation) {
            context.conversation = conversation;
          }
        } catch {
          // Handled gracefully in individual evaluators
        }
      }
    }

    // Message hydration for MESSAGE_CONTAINS, AI_INTENT
    if (['MESSAGE_CONTAINS', 'AI_INTENT'].includes(conditionType)) {
      if (!context.message && context.messageId) {
        try {
          const { rows } = await sql`
            SELECT id, workspace_id, project_id, conversation_id, body, caption, type
            FROM messages
            WHERE id = ${context.messageId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
            LIMIT 1
          `;
          if (rows.length > 0) {
            context.message = rows[0];
          }
        } catch {
          // Handled gracefully in individual evaluators
        }
      }

      if (!context.message && context.variables?.message) {
        const varMsg = context.variables.message;
        if (typeof varMsg === 'string') {
          context.message = { body: varMsg };
        } else if (typeof varMsg === 'object' && varMsg !== null) {
          context.message = {
            body: varMsg.body || varMsg.text || '',
            caption: varMsg.caption,
            type: varMsg.type || 'text',
          };
        }
      }
    }
  }
}

export const conditionEngine = new ConditionEngine();
