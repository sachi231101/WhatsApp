import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';

export interface ActionIdempotencyRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  executionId: string;
  nodeId: string;
  idempotencyKey: string;
  actionType: string;
  status: string;
  sideEffectId?: string | null;
  output: Record<string, any>;
  createdAt: string;
}

export interface RecordActionParams {
  workspaceId: string;
  projectId: string;
  executionId: string;
  nodeId: string;
  actionType: string;
  status?: string;
  sideEffectId?: string | null;
  output?: Record<string, any>;
}

export class ActionIdempotencyService {
  private static testRecords = new Map<string, ActionIdempotencyRecord>();

  /**
   * Generates the authoritative idempotency key for an action node execution.
   */
  static generateKey(
    workspaceId: string,
    projectId: string,
    executionId: string,
    nodeId: string
  ): string {
    return `${workspaceId}:${projectId}:${executionId}:${nodeId}`;
  }

  /**
   * Checks if an action was already executed for this execution + node.
   */
  static async get(
    workspaceId: string,
    projectId: string,
    executionId: string,
    nodeId: string
  ): Promise<ActionIdempotencyRecord | null> {
    const key = this.generateKey(workspaceId, projectId, executionId, nodeId);

    // Check memory store (useful for tests and fast-path)
    if (this.testRecords.has(key)) {
      return this.testRecords.get(key)!;
    }

    try {
      await ensureCoreTables();
      const { rows } = await sql`
        SELECT * FROM action_idempotency
        WHERE project_id = ${projectId} AND idempotency_key = ${key}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return null;
      }

      const r = rows[0];
      const record: ActionIdempotencyRecord = {
        id: r.id,
        workspaceId: r.workspace_id,
        projectId: r.project_id,
        executionId: r.execution_id,
        nodeId: r.node_id,
        idempotencyKey: r.idempotency_key,
        actionType: r.action_type,
        status: r.status,
        sideEffectId: r.side_effect_id || null,
        output: typeof r.output === 'string' ? JSON.parse(r.output) : r.output || {},
        createdAt: r.created_at,
      };

      this.testRecords.set(key, record);
      return record;
    } catch {
      return null;
    }
  }

  /**
   * Records a completed action execution to prevent duplicate execution on worker retries.
   */
  static async record(params: RecordActionParams): Promise<ActionIdempotencyRecord> {
    const {
      workspaceId,
      projectId,
      executionId,
      nodeId,
      actionType,
      status = 'COMPLETED',
      sideEffectId = null,
      output = {},
    } = params;

    const key = this.generateKey(workspaceId, projectId, executionId, nodeId);

    const record: ActionIdempotencyRecord = {
      id: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      projectId,
      executionId,
      nodeId,
      idempotencyKey: key,
      actionType,
      status,
      sideEffectId,
      output,
      createdAt: new Date().toISOString(),
    };

    // Store in memory cache
    this.testRecords.set(key, record);

    try {
      await ensureCoreTables();
      await sql`
        INSERT INTO action_idempotency (
          workspace_id, project_id, execution_id, node_id,
          idempotency_key, action_type, status, side_effect_id, output, created_at
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${executionId}, ${nodeId},
          ${key}, ${actionType}, ${status}, ${sideEffectId},
          ${JSON.stringify(output)}, CURRENT_TIMESTAMP
        )
        ON CONFLICT (project_id, idempotency_key) DO UPDATE SET
          status = EXCLUDED.status,
          side_effect_id = COALESCE(EXCLUDED.side_effect_id, action_idempotency.side_effect_id),
          output = EXCLUDED.output
      `;
    } catch (err) {
      console.warn('[ActionIdempotencyService] Notice on persisting idempotency record:', err);
    }

    return record;
  }

  /**
   * Clears in-memory test store.
   */
  static clearTestRecords(): void {
    this.testRecords.clear();
  }

  static clearCache(): void {
    this.testRecords.clear();
  }

  static clear(): void {
    this.testRecords.clear();
  }
}
