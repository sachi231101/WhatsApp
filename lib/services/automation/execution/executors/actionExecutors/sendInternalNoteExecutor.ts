import { AutomationNodeRecord } from '../../../types';
import { ExecutionContext, NodeExecutionResult, ActionNodeExecutor } from '../../types';
import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { publishInboxEvent } from '@/lib/realtime/ablyPublisher';
import { VariableResolver } from '@/lib/services/automation/execution/variableResolver';

export class SendInternalNoteExecutor implements ActionNodeExecutor {
  async execute(
    node: AutomationNodeRecord,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.configuration || {};
    const { workspaceId, projectId, conversationId, executionId } = context;

    if (!conversationId) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Cannot add internal note: No conversation associated with this workflow execution.',
      };
    }

    const rawContent = config.text ?? config.noteContent;
    if (!rawContent || !String(rawContent).trim()) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Internal note content is required.',
      };
    }

    // 1. Resolve Dynamic Variables in Note Content
    const resolvedContent = VariableResolver.resolveString(String(rawContent), context).trim();
    if (!resolvedContent) {
      return {
        status: 'FAILED',
        errorCode: 'INVALID_CONFIGURATION',
        errorMessage: 'Resolved internal note content cannot be empty.',
      };
    }

    try {
      await ensureCoreTables();

      // 2. Verify Conversation belongs to workspace & project
      const { rows: convCheck } = await sql`
        SELECT id FROM conversations
        WHERE id = ${conversationId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
        LIMIT 1
      `;
      if (convCheck.length === 0) {
        return {
          status: 'FAILED',
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: 'Conversation not found or access denied.',
        };
      }

      // 3. Idempotency Check: prevent duplicate notes on worker retries
      // Check if note for this execution + node was already created
      const { rows: existingNotes } = await sql`
        SELECT id, content, created_at FROM internal_notes
        WHERE conversation_id = ${conversationId}
          AND workspace_id = ${workspaceId}
          AND project_id = ${projectId}
          AND metadata->>'executionId' = ${executionId}
          AND metadata->>'nodeId' = ${node.id}
        LIMIT 1
      `;

      if (existingNotes.length > 0) {
        const existing = existingNotes[0];
        return {
          status: 'COMPLETED',
          output: {
            action: 'SEND_INTERNAL_NOTE',
            noteId: existing.id,
            content: existing.content,
            deduplicated: true,
          },
          sideEffectId: existing.id,
        };
      }

      // 4. Insert Internal Note (Strictly internal - NEVER dispatched to Meta / WhatsApp)
      const noteMetadata = JSON.stringify({
        executionId,
        nodeId: node.id,
        automationId: context.automationId,
        source: 'AUTOMATION',
      });

      const { rows: noteRows } = await sql`
        INSERT INTO internal_notes (
          workspace_id, project_id, conversation_id, user_id, content,
          source, metadata, created_at, updated_at
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${conversationId}, NULL, ${resolvedContent},
          'AUTOMATION', ${noteMetadata}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, content, created_at
      `;

      const note = noteRows[0];

      // 5. Broadcast Realtime Event to Inbox Timeline
      try {
        await publishInboxEvent({
          workspaceId,
          projectId,
          event: 'note.created',
          data: {
            conversationId,
            note: {
              id: note.id,
              body: note.content,
              is_internal: true,
              type: 'internal_note',
              sender_name: 'Automation',
              created_at: note.created_at,
            },
          },
        });
      } catch (evtErr) {
        console.warn('[SendInternalNoteExecutor] Failed to publish realtime event:', evtErr);
      }

      return {
        status: 'COMPLETED',
        output: {
          action: 'SEND_INTERNAL_NOTE',
          noteId: note.id,
          content: note.content,
          deduplicated: false,
        },
        sideEffectId: note.id,
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorCode: 'ACTION_ERROR',
        errorMessage: err?.message || 'Failed to create internal note.',
      };
    }
  }
}
