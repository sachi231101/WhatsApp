import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { automationDomainService } from '../automationDomainService';
import { AutomationExecutionRecord, AutomationNodeRecord } from '../types';
import { ExecutionContext, ExecutionErrorCode } from './types';
import { WorkflowGraph } from './workflowGraph';
import { EdgeResolver } from './edgeResolver';
import { NodeExecutorRegistry } from './nodeExecutorRegistry';
import { ExecutionLockService } from './executionLock';
import { executionObservability } from './executionObservability';

export interface AutomationEngineRunOptions {
  maxSteps?: number;
  timeoutMs?: number;
  resumeFromCurrentNode?: boolean;
  attemptNumber?: number;
}

export class AutomationEngine {
  private static readonly DEFAULT_MAX_STEPS = 100;
  private static readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

  /**
   * Main runtime entry point: executes an automation run from its current persistent state.
   */
  async run(
    executionId: string,
    options?: AutomationEngineRunOptions
  ): Promise<AutomationExecutionRecord> {
    await ensureCoreTables();
    const maxSteps = options?.maxSteps || AutomationEngine.DEFAULT_MAX_STEPS;
    const timeoutMs = options?.timeoutMs || AutomationEngine.DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    // 1. Acquire Distributed Concurrency Lock
    const lock = await ExecutionLockService.acquire(executionId);
    if (!lock.acquired) {
      await executionObservability.log({
        action: 'automation.execution.lock_failed',
        workspaceId: 'unknown',
        projectId: 'unknown',
        executionId,
        durationMs: Date.now() - startTime,
        reason: 'Concurrent worker execution prevented by distributed lock.',
        errorCode: 'LOCK_ACQUISITION_FAILED',
      });
      throw new Error(`Execution "${executionId}" is currently being processed by another worker.`);
    }

    try {
      // 2. Load Execution from Database
      const { rows: execRows } = await sql`
        SELECT *
        FROM automation_executions
        WHERE id = ${executionId}
        LIMIT 1;
      `;

      if (!execRows || execRows.length === 0) {
        throw new Error(`Automation execution "${executionId}" not found.`);
      }

      let executionRow = execRows[0];
      const workspaceId = executionRow.workspace_id;
      const projectId = executionRow.project_id;
      const automationId = executionRow.automation_id;
      const versionId = executionRow.automation_version_id;

      // Check if already in a terminal state
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(executionRow.status)) {
        return await automationDomainService.getExecution(workspaceId, projectId, executionId);
      }

      // 3. Tenant Isolation & Automation State Check
      const { rows: autoRows } = await sql`
        SELECT id, workspace_id, project_id, status, current_version_id
        FROM automations
        WHERE id = ${automationId}
          AND workspace_id = ${workspaceId}
          AND project_id = ${projectId}
        LIMIT 1;
      `;

      if (!autoRows || autoRows.length === 0) {
        return await this.failExecution(
          workspaceId,
          projectId,
          executionId,
          'TENANT_ACCESS_ERROR',
          'Automation does not belong to the execution project/workspace.'
        );
      }

      const automation = autoRows[0];

      // If automation is PAUSED, cancel queued execution cleanly
      if (automation.status === 'PAUSED') {
        await executionObservability.log({
          action: 'automation.execution.cancelled',
          workspaceId,
          projectId,
          automationId,
          versionId,
          executionId,
          status: 'CANCELLED',
          durationMs: Date.now() - startTime,
          reason: 'Automation is paused. Queued execution was cancelled.',
        });

        const cancelled = await automationDomainService.updateExecutionStatus(workspaceId, projectId, executionId, {
          status: 'CANCELLED',
          errorMessage: 'Automation is paused.',
          completedAt: new Date().toISOString(),
        });

        return (
          cancelled || {
            id: executionId,
            workspaceId,
            projectId,
            automationId,
            automationVersionId: versionId,
            triggerType: executionRow.trigger_type,
            triggerEventId: executionRow.trigger_event_id || null,
            idempotencyKey: executionRow.idempotency_key || null,
            conversationId: executionRow.conversation_id || null,
            contactId: executionRow.contact_id || null,
            status: 'CANCELLED',
            currentNodeId: null,
            startedAt: null,
            completedAt: new Date().toISOString(),
            failedAt: null,
            errorCode: null,
            errorMessage: 'Automation is paused.',
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );
      }

      // Must be ACTIVE
      if (automation.status !== 'ACTIVE') {
        return await this.failExecution(
          workspaceId,
          projectId,
          executionId,
          'AUTOMATION_ARCHIVED',
          `Automation status is "${automation.status}". Only ACTIVE automations can execute.`
        );
      }

      // 4. Version Integrity & Immutability Verification
      const { rows: verRows } = await sql`
        SELECT id, automation_id, status, version_number
        FROM automation_versions
        WHERE id = ${versionId}
          AND automation_id = ${automationId}
        LIMIT 1;
      `;

      if (!verRows || verRows.length === 0) {
        return await this.failExecution(
          workspaceId,
          projectId,
          executionId,
          'VERSION_NOT_FOUND',
          'Automation version referenced by this execution does not exist.'
        );
      }

      const version = verRows[0];

      // Strictly verify version is PUBLISHED (Never execute DRAFT)
      if (version.status !== 'PUBLISHED') {
        return await this.failExecution(
          workspaceId,
          projectId,
          executionId,
          'VERSION_NOT_PUBLISHED',
          `Cannot execute automation version in "${version.status}" status. Only PUBLISHED versions can execute.`
        );
      }

      // 5. Transition to RUNNING
      if (executionRow.status === 'QUEUED') {
        const updateRes = await sql`
          UPDATE automation_executions
          SET status = 'RUNNING',
              started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${executionId}
          RETURNING *;
        `;
        if (updateRes.rows && updateRes.rows[0]) {
          executionRow = { ...executionRow, ...updateRes.rows[0], status: 'RUNNING' };
        } else {
          executionRow = { ...executionRow, status: 'RUNNING' };
        }

        await executionObservability.log({
          action: 'automation.execution.started',
          workspaceId,
          projectId,
          automationId,
          versionId,
          executionId,
          status: 'RUNNING',
          durationMs: Date.now() - startTime,
        });
      } else if (executionRow.status === 'RUNNING') {
        await executionObservability.log({
          action: 'automation.execution.resumed',
          workspaceId,
          projectId,
          automationId,
          versionId,
          executionId,
          status: 'RUNNING',
          durationMs: Date.now() - startTime,
        });
      }

      // 6. Load Workflow Graph
      const graph = await WorkflowGraph.load(versionId);
      const graphValidation = graph.validate();
      if (!graphValidation.valid) {
        return await this.failExecution(
          workspaceId,
          projectId,
          executionId,
          'INVALID_NODE',
          `Workflow graph validation failed: ${graphValidation.errors.join('; ')}`
        );
      }

      // 7. Resolve Starting Node
      let currentNode: AutomationNodeRecord | undefined;
      if (executionRow.current_node_id) {
        currentNode = graph.getNode(executionRow.current_node_id);
      }
      if (!currentNode) {
        currentNode = graph.getTriggerNode();
      }

      if (!currentNode) {
        return await this.failExecution(
          workspaceId,
          projectId,
          executionId,
          'NODE_NOT_FOUND',
          'Could not resolve entry point node in workflow graph.'
        );
      }

      // 8. Build Execution Context
      const parsedTriggerContext =
        typeof executionRow.trigger_context === 'string'
          ? JSON.parse(executionRow.trigger_context)
          : executionRow.trigger_context || {};
      const parsedMetadata =
        typeof executionRow.metadata === 'string'
          ? JSON.parse(executionRow.metadata)
          : executionRow.metadata || {};

      const attemptNumber = options?.attemptNumber || 1;
      const context: ExecutionContext = {
        executionId,
        workspaceId,
        projectId,
        automationId,
        automationVersionId: versionId,
        triggerType: executionRow.trigger_type,
        triggerEventId: executionRow.trigger_event_id,
        idempotencyKey: executionRow.idempotency_key,
        contactId: executionRow.contact_id || parsedTriggerContext.contactId || parsedTriggerContext.contact_id || null,
        conversationId: executionRow.conversation_id || parsedTriggerContext.conversationId || parsedTriggerContext.conversation_id || null,
        variables: {
          ...parsedTriggerContext,
          ...(parsedMetadata.variables || {}),
        },
        currentNodeId: currentNode.id,
        visitedNodeIds: [],
        stepCount: 0,
        attemptNumber,
        startedAt: startTime,
        metadata: (typeof executionRow.metadata === 'string' ? JSON.parse(executionRow.metadata) : executionRow.metadata) || {},
      };

      // Restore previously completed AI variables if resuming or retrying an execution
      if (executionRow.status === 'RUNNING' || attemptNumber > 1) {
        const { rows: completedStepRows } = await sql`
          SELECT output FROM automation_execution_steps
          WHERE execution_id = ${executionId}
            AND status = 'COMPLETED'
          ORDER BY created_at ASC;
        `.catch(() => ({ rows: [] as any[] }));

        for (const sRow of completedStepRows) {
          const out = typeof sRow.output === 'string' ? JSON.parse(sRow.output) : sRow.output;
          if (out && typeof out === 'object') {
            if (
              out.response !== undefined ||
              out.sentiment !== undefined ||
              out.summary !== undefined ||
              out.extracted !== undefined ||
              out.shouldEscalate !== undefined
            ) {
              context.variables.ai = {
                ...(context.variables.ai || {}),
                ...(out.response !== undefined ? { response: out.response } : {}),
                ...(out.sentiment !== undefined ? { sentiment: out.sentiment } : {}),
                ...(out.confidence !== undefined ? { sentiment_confidence: out.confidence, sentimentConfidence: out.confidence } : {}),
                ...(out.summary !== undefined ? { summary: out.summary } : {}),
                ...(out.extracted !== undefined ? { extracted: out.extracted } : {}),
                ...(out.shouldEscalate !== undefined ? { should_escalate: out.shouldEscalate, shouldEscalate: out.shouldEscalate } : {}),
              };
              if (out.sentiment !== undefined) {
                context.variables.sentiment = out.sentiment;
              }
            }
          }
        }
      }

      // 9. Core Execution Loop
      while (currentNode) {
        // A. Max Steps Cycle Protection
        if (context.stepCount >= maxSteps) {
          return await this.failExecution(
            workspaceId,
            projectId,
            executionId,
            'MAX_EXECUTION_STEPS_EXCEEDED',
            `Execution exceeded maximum allowed step limit of ${maxSteps} nodes.`
          );
        }

        // B. Execution Timeout Protection
        if (Date.now() - startTime > timeoutMs) {
          return await this.failExecution(
            workspaceId,
            projectId,
            executionId,
            'EXECUTION_TIMEOUT',
            `Execution timed out after ${timeoutMs}ms.`
          );
        }

        context.currentNodeId = currentNode.id;
        context.visitedNodeIds.push(currentNode.id);
        context.stepCount++;

        // C. Record Execution Step: RUNNING
        const step = await automationDomainService.createExecutionStep(workspaceId, projectId, {
          executionId,
          nodeId: currentNode.id,
          status: 'RUNNING',
          input: {
            attempt: attemptNumber,
            nodeKey: currentNode.nodeKey,
            nodeType: currentNode.type,
            configuration: currentNode.configuration,
          },
          startedAt: new Date().toISOString(),
        });

        await executionObservability.log({
          action: 'automation.node.started',
          workspaceId,
          projectId,
          automationId,
          versionId,
          executionId,
          nodeId: currentNode.id,
          nodeType: currentNode.type,
          stepCount: context.stepCount,
          durationMs: Date.now() - startTime,
        });

        // D. Resolve Executor & Run Node
        const executor = NodeExecutorRegistry.resolve(currentNode);
        const nodeStartTime = Date.now();
        const result = await executor.execute(currentNode, context);
        const nodeDurationMs = Date.now() - nodeStartTime;

        // E. Handle Node Execution Failure
        if (result.status === 'FAILED') {
          await automationDomainService.updateExecutionStep(step.id, {
            status: 'FAILED',
            output: {
              attempt: attemptNumber,
              ...(result.output || {}),
            },
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            completedAt: new Date().toISOString(),
          });

          await executionObservability.log({
            action: 'automation.node.failed',
            workspaceId,
            projectId,
            automationId,
            versionId,
            executionId,
            nodeId: currentNode.id,
            nodeType: currentNode.type,
            durationMs: nodeDurationMs,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
          });

          return await this.failExecution(
            workspaceId,
            projectId,
            executionId,
            result.errorCode || 'ACTION_ERROR',
            result.errorMessage || `Node "${currentNode.label}" execution failed.`
          );
        }

        // F. Update Step: COMPLETED
        await automationDomainService.updateExecutionStep(step.id, {
          status: 'COMPLETED',
          output: {
            attempt: attemptNumber,
            ...(result.output || {}),
          },
          completedAt: new Date().toISOString(),
        });

        // Update runtime ExecutionContext variables with node outputs
        if (result.output) {
          const out = result.output;
          if (
            out.response !== undefined ||
            out.sentiment !== undefined ||
            out.summary !== undefined ||
            out.extracted !== undefined ||
            out.shouldEscalate !== undefined ||
            out.action?.startsWith('AI_') ||
            out.action === 'ANALYZE_SENTIMENT' ||
            out.action === 'EXTRACT_INFORMATION' ||
            out.action === 'GENERATE_SUMMARY'
          ) {
            context.variables.ai = {
              ...(context.variables.ai || {}),
              ...(out.response !== undefined ? { response: out.response } : {}),
              ...(out.sentiment !== undefined ? { sentiment: out.sentiment } : {}),
              ...(out.confidence !== undefined ? { sentiment_confidence: out.confidence, sentimentConfidence: out.confidence } : {}),
              ...(out.summary !== undefined ? { summary: out.summary } : {}),
              ...(out.extracted !== undefined ? { extracted: out.extracted } : {}),
              ...(out.shouldEscalate !== undefined ? { should_escalate: out.shouldEscalate, shouldEscalate: out.shouldEscalate } : {}),
              ...(out.escalationReason !== undefined ? { escalation_reason: out.escalationReason, escalationReason: out.escalationReason } : {}),
            };
            if (out.sentiment !== undefined) {
              context.variables.sentiment = out.sentiment;
            }
          }
        }

        await executionObservability.log({
          action: 'automation.node.completed',
          workspaceId,
          projectId,
          automationId,
          versionId,
          executionId,
          nodeId: currentNode.id,
          nodeType: currentNode.type,
          branch: result.branch,
          durationMs: nodeDurationMs,
        });

        // G. Check Terminal State
        const isTerminal =
          currentNode.type?.toUpperCase() === 'TERMINAL' ||
          currentNode.type?.toUpperCase() === 'END' ||
          graph.isTerminalNode(currentNode.id);

        if (isTerminal) {
          // Execution Successfully Reached Terminal State
          const completedExecution = await automationDomainService.updateExecutionStatus(
            workspaceId,
            projectId,
            executionId,
            {
              status: 'COMPLETED',
              currentNodeId: null,
              completedAt: new Date().toISOString(),
            }
          );

          await executionObservability.log({
            action: 'automation.execution.completed',
            workspaceId,
            projectId,
            automationId,
            versionId,
            executionId,
            status: 'COMPLETED',
            durationMs: Date.now() - startTime,
            stepCount: context.stepCount,
          });

          return (
            completedExecution || {
              id: executionId,
              workspaceId,
              projectId,
              automationId,
              automationVersionId: versionId,
              triggerType: executionRow.trigger_type,
              triggerEventId: executionRow.trigger_event_id || null,
              idempotencyKey: executionRow.idempotency_key || null,
              conversationId: executionRow.conversation_id || null,
              contactId: executionRow.contact_id || null,
              status: 'COMPLETED',
              currentNodeId: null,
              startedAt: null,
              completedAt: new Date().toISOString(),
              failedAt: null,
              errorCode: null,
              errorMessage: null,
              metadata: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
        }

        // H. Resolve Outgoing Edge to Select Next Node
        const nextEdge = EdgeResolver.resolveNextEdge(currentNode, result, graph);

        if (!nextEdge) {
          return await this.failExecution(
            workspaceId,
            projectId,
            executionId,
            'NO_MATCHING_BRANCH',
            `No matching outgoing edge found from node "${currentNode.label}" for branch "${result.branch || 'default'}".`
          );
        }

        const nextNode = graph.getNode(nextEdge.targetNodeId);
        if (!nextNode) {
          return await this.failExecution(
            workspaceId,
            projectId,
            executionId,
            'INVALID_EDGE',
            `Edge points to non-existent target node ID: "${nextEdge.targetNodeId}".`
          );
        }

        // Persist current_node_id update before executing next node for crash recovery
        await sql`
          UPDATE automation_executions
          SET current_node_id = ${nextNode.id},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${executionId};
        `;

        currentNode = nextNode;
      }

      // Default fallback return
      return await automationDomainService.getExecution(workspaceId, projectId, executionId);
    } finally {
      // 10. Always release execution lock
      await ExecutionLockService.release(executionId, lock.token);
    }
  }

  /**
   * Helper to mark execution as FAILED and record structured telemetry.
   */
  private async failExecution(
    workspaceId: string,
    projectId: string,
    executionId: string,
    errorCode: ExecutionErrorCode | string,
    errorMessage: string
  ): Promise<AutomationExecutionRecord> {
    const failedRecord = await automationDomainService.updateExecutionStatus(
      workspaceId,
      projectId,
      executionId,
      {
        status: 'FAILED',
        errorCode,
        errorMessage,
        failedAt: new Date().toISOString(),
      }
    );

    await executionObservability.log({
      action: 'automation.execution.failed',
      workspaceId,
      projectId,
      executionId,
      status: 'FAILED',
      errorCode,
      errorMessage,
      durationMs: 0,
    });

    return (
      failedRecord || {
        id: executionId,
        workspaceId,
        projectId,
        automationId: '',
        automationVersionId: '',
        triggerType: 'UNKNOWN',
        triggerEventId: null,
        idempotencyKey: null,
        conversationId: null,
        contactId: null,
        status: 'FAILED',
        errorCode: errorCode as any,
        errorMessage,
        currentNodeId: null,
        startedAt: null,
        completedAt: null,
        failedAt: new Date().toISOString(),
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }
}

export const automationEngine = new AutomationEngine();
