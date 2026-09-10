import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { DomainEvent, domainEventDispatcher } from '@/lib/events/domainEvent';
import { createTriggerContext } from './triggerContext';
import { TriggerValidator } from './triggerValidator';
import { TriggerMatcher, TriggerMatchResult } from './triggerMatcher';
import { triggerObservability } from './triggerObservability';
import { enqueueAutomationExecution } from '@/lib/queue/automationExecutionQueue';
import { automationDomainService } from './automationDomainService';
import { AutomationExecutionRecord, AutomationNodeRecord } from './types';

export interface TriggerExecutionResult {
  automationId: string;
  automationVersionId: string;
  execution?: AutomationExecutionRecord;
  isDuplicate: boolean;
  matched: boolean;
  reason?: string;
}

export interface AutomationTriggerServiceResult {
  success: boolean;
  eventId: string;
  eventType: string;
  matchedCount: number;
  createdExecutions: AutomationExecutionRecord[];
  duplicateCount: number;
  results: TriggerExecutionResult[];
}

const SUPPORTED_TRIGGER_TYPES = new Set([
  'NEW_WHATSAPP_MESSAGE',
  'KEYWORD_MATCH',
  'CONVERSATION_CREATED',
  'CUSTOMER_REPLIED',
  'CONTACT_CREATED',
  'TAG_ADDED',
  'SCHEDULED_TRIGGER',
]);

export class AutomationTriggerService {
  /**
   * Primary entry point: Handles an incoming domain event, discovers matching active
   * automations, validates configurations, creates queued executions, and dispatches BullMQ jobs.
   */
  async handle(event: DomainEvent): Promise<AutomationTriggerServiceResult> {
    await ensureCoreTables();

    const startTime = Date.now();
    const { id: eventId, type: eventType, workspaceId, projectId, metadata } = event;

    triggerObservability.log({
      action: 'automation.trigger.received',
      workspaceId,
      projectId,
      eventId,
      eventType,
    });

    const summary: AutomationTriggerServiceResult = {
      success: true,
      eventId,
      eventType,
      matchedCount: 0,
      createdExecutions: [],
      duplicateCount: 0,
      results: [],
    };

    // 1. Validation of essential event attributes
    if (!eventId || !eventType || !workspaceId || !projectId) {
      triggerObservability.log({
        action: 'automation.trigger.failed',
        workspaceId: workspaceId || 'unknown',
        projectId: projectId || 'unknown',
        eventId,
        eventType,
        error: 'Missing mandatory event parameters (id, type, workspaceId, projectId).',
      });
      return { ...summary, success: false };
    }

    // 2. Strict Tenant Isolation Check
    // Verify that projectId belongs to workspaceId
    const { rows: projRows } = await sql`
      SELECT id FROM projects
      WHERE id = ${projectId} AND workspace_id = ${workspaceId}
      LIMIT 1;
    `;
    if (!projRows || projRows.length === 0) {
      triggerObservability.log({
        action: 'automation.trigger.failed',
        workspaceId,
        projectId,
        eventId,
        eventType,
        error: `Tenant violation: Project "${projectId}" does not belong to workspace "${workspaceId}".`,
      });
      return { ...summary, success: false };
    }

    // 3. Obvious Recursion / Self-trigger Loop Prevention
    if (metadata?.source === 'automation' && eventType.startsWith('automation.')) {
      triggerObservability.log({
        action: 'automation.trigger.ignored',
        workspaceId,
        projectId,
        eventId,
        eventType,
        reason: 'Event was produced by an automation execution; suppressed to prevent loops.',
      });
      return summary;
    }

    // 4. Build normalized trigger context
    const context = createTriggerContext(event);

    // 5. Query Project-scoped ACTIVE Automations only
    // Excludes DRAFT, PAUSED, and ARCHIVED automations
    const { rows: activeAutomations } = await sql`
      SELECT a.id, a.workspace_id, a.project_id, a.name, a.status, a.current_version_id
      FROM automations a
      WHERE a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId}
        AND a.status = 'ACTIVE'
        AND a.current_version_id IS NOT NULL;
    `;

    if (!activeAutomations || activeAutomations.length === 0) {
      return summary;
    }

    // 6. Inspect trigger node and evaluate match for each active automation
    for (const auto of activeAutomations) {
      const automationId = auto.id;
      const currentVersionId = auto.current_version_id;

      // Loop & Recursion Protection for automation-generated events
      if (metadata?.source === 'automation') {
        const originId = metadata.originAutomationId;
        const chain: string[] = Array.isArray(metadata.eventChain) ? metadata.eventChain : [];

        // Suppress self-trigger loop
        if (originId && originId === automationId) {
          triggerObservability.log({
            action: 'automation.trigger.ignored',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            eventId,
            reason: `Self-trigger loop suppressed: Event was produced by automation "${automationId}".`,
          });
          continue;
        }

        // Suppress cycle in event chain
        if (chain.includes(automationId)) {
          triggerObservability.log({
            action: 'automation.trigger.ignored',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            eventId,
            reason: `Cyclic loop suppressed: Automation "${automationId}" already in event chain [${chain.join(', ')}].`,
          });
          continue;
        }

        // Suppress max recursion depth
        if (chain.length >= 5) {
          triggerObservability.log({
            action: 'automation.trigger.ignored',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            eventId,
            reason: `Recursion depth limit reached (${chain.length}). Event suppressed.`,
          });
          continue;
        }
      }

      try {
        // Ensure the current version is actually PUBLISHED (never run DRAFT or ARCHIVED versions)
        const { rows: versionRows } = await sql`
          SELECT id, status, version_number
          FROM automation_versions
          WHERE id = ${currentVersionId}
            AND automation_id = ${automationId}
            AND status = 'PUBLISHED'
          LIMIT 1;
        `;

        if (!versionRows || versionRows.length === 0) {
          triggerObservability.log({
            action: 'automation.trigger.ignored',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            eventId,
            reason: 'Active automation has no published current version.',
          });
          continue;
        }

        // Fetch trigger node(s) for this version
        const { rows: nodeRows } = await sql`
          SELECT id, automation_version_id, node_key, type, label, position_x, position_y, configuration
          FROM automation_nodes
          WHERE automation_version_id = ${currentVersionId};
        `;

        const allNodes: AutomationNodeRecord[] = (nodeRows || []).map((row: any) => ({
          id: row.id,
          automationVersionId: row.automation_version_id,
          nodeKey: row.node_key,
          type: row.type,
          label: row.label,
          positionX: Number(row.position_x || 0),
          positionY: Number(row.position_y || 0),
          configuration:
            typeof row.configuration === 'string'
              ? JSON.parse(row.configuration)
              : row.configuration || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        // Find entry trigger node(s)
        const triggerNodes = allNodes.filter((n) =>
          SUPPORTED_TRIGGER_TYPES.has(String(n.type || '').toUpperCase().trim())
        );

        if (triggerNodes.length === 0) {
          triggerObservability.log({
            action: 'automation.trigger.ignored',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            eventId,
            reason: 'Published version contains no supported trigger nodes.',
          });
          continue;
        }

        // For this phase, evaluate each trigger node defined in the workflow
        for (const triggerNode of triggerNodes) {
          const triggerType = String(triggerNode.type || '').toUpperCase().trim();

          // Validate trigger configuration at runtime
          const validation = TriggerValidator.validate(triggerType, triggerNode.configuration);
          if (!validation.valid) {
            triggerObservability.log({
              action: 'automation.trigger.ignored',
              workspaceId,
              projectId,
              automationId,
              automationVersionId: currentVersionId,
              eventId,
              triggerType,
              reason: `Invalid trigger configuration: ${validation.errors.join(', ')}`,
            });
            continue;
          }

          // Evaluate trigger match
          const matchResult: TriggerMatchResult = TriggerMatcher.matches(triggerNode, context);
          if (!matchResult.matched) {
            triggerObservability.log({
              action: 'automation.trigger.ignored',
              workspaceId,
              projectId,
              automationId,
              automationVersionId: currentVersionId,
              eventId,
              triggerType,
              reason: matchResult.reason || 'Trigger conditions not met.',
            });
            summary.results.push({
              automationId,
              automationVersionId: currentVersionId,
              isDuplicate: false,
              matched: false,
              reason: matchResult.reason,
            });
            continue;
          }

          // Trigger Matched!
          summary.matchedCount++;
          triggerObservability.log({
            action: 'automation.trigger.matched',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            eventId,
            triggerType,
          });

          // Generate stable idempotency key: automationId:automationVersionId:eventId
          const idempotencyKey = `${automationId}:${currentVersionId}:${eventId}`;

          // Create execution record with QUEUED status and database idempotency protection
          const { execution, isDuplicate } = await automationDomainService.createExecution({
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            triggerType,
            triggerEventId: eventId,
            idempotencyKey,
            conversationId: context.conversationId,
            contactId: context.contactId,
            currentNodeId: triggerNode.id,
            metadata: {
              triggerContext: context,
              matchedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
            },
          });

          if (isDuplicate) {
            summary.duplicateCount++;
            triggerObservability.log({
              action: 'automation.trigger.duplicate',
              workspaceId,
              projectId,
              automationId,
              automationVersionId: currentVersionId,
              executionId: execution.id,
              eventId,
              triggerType,
              reason: `Execution with idempotency key "${idempotencyKey}" already exists.`,
            });
            summary.results.push({
              automationId,
              automationVersionId: currentVersionId,
              execution,
              isDuplicate: true,
              matched: true,
            });
            continue;
          }

          triggerObservability.log({
            action: 'automation.execution.created',
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            executionId: execution.id,
            eventId,
            triggerType,
          });

          // Dispatch job to BullMQ queue
          const queueResult = await enqueueAutomationExecution({
            executionId: execution.id,
            workspaceId,
            projectId,
            automationId,
            automationVersionId: currentVersionId,
            triggerType,
            triggerNodeId: triggerNode.id,
            context,
          });

          if (!queueResult.enqueued) {
            triggerObservability.recordQueueFailure();
            triggerObservability.log({
              action: 'automation.trigger.failed',
              workspaceId,
              projectId,
              automationId,
              automationVersionId: currentVersionId,
              executionId: execution.id,
              eventId,
              triggerType,
              error: 'BullMQ enqueue failed; recorded in execution record.',
            });
          } else {
            triggerObservability.log({
              action: 'automation.execution.queued',
              workspaceId,
              projectId,
              automationId,
              automationVersionId: currentVersionId,
              executionId: execution.id,
              eventId,
              triggerType,
            });
          }

          summary.createdExecutions.push(execution);
          summary.results.push({
            automationId,
            automationVersionId: currentVersionId,
            execution,
            isDuplicate: false,
            matched: true,
          });
        }
      } catch (autoErr: any) {
        triggerObservability.log({
          action: 'automation.trigger.failed',
          workspaceId,
          projectId,
          automationId,
          automationVersionId: currentVersionId,
          eventId,
          error: autoErr?.message || String(autoErr),
        });
      }
    }

    return summary;
  }

  /**
   * Internal testable interface for matching evaluation without hitting the DB.
   */
  testTrigger(triggerNode: AutomationNodeRecord, event: DomainEvent): TriggerMatchResult {
    const context = createTriggerContext(event);
    return TriggerMatcher.matches(triggerNode, context);
  }
}

export const automationTriggerService = new AutomationTriggerService();

// Register automationTriggerService as a subscriber to all domain events
domainEventDispatcher.subscribeAll(async (event) => {
  await automationTriggerService.handle(event);
});
