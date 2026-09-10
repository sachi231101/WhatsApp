import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import {
  AutomationRecord,
  AutomationVersionRecord,
  AutomationNodeRecord,
  AutomationEdgeRecord,
  AutomationExecutionRecord,
  AutomationExecutionStepRecord,
  CreateAutomationInput,
  UpdateAutomationInput,
  CreateVersionInput,
  CreateNodeInput,
  UpdateNodeInput,
  CreateEdgeInput,
  CreateExecutionInput,
  CreateExecutionStepInput,
  AutomationStatus,
  AutomationVersionStatus,
  AutomationExecutionStatus,
  AutomationExecutionStepStatus,
  AutomationNotFoundError,
  AutomationVersionNotFoundError,
  AutomationVersionImmutableError,
  AutomationTenantViolationError,
  AutomationNodeDuplicateKeyError,
  AutomationEdgeInvalidNodeError,
  AutomationIdempotencyConflictError,
} from './types';

// Helper mappers from DB rows to domain entities
function mapAutomationRow(row: any): AutomationRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || null,
    status: row.status as AutomationStatus,
    currentVersionId: row.current_version_id || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    archivedAt: row.archived_at ? (row.archived_at instanceof Date ? row.archived_at.toISOString() : String(row.archived_at)) : null,
  };
}

function mapVersionRow(row: any): AutomationVersionRecord {
  return {
    id: row.id,
    automationId: row.automation_id,
    versionNumber: Number(row.version_number),
    status: row.status as AutomationVersionStatus,
    createdBy: row.created_by || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    publishedAt: row.published_at ? (row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at)) : null,
  };
}

function mapNodeRow(row: any): AutomationNodeRecord {
  return {
    id: row.id,
    automationVersionId: row.automation_version_id,
    nodeKey: row.node_key,
    type: row.type,
    label: row.label,
    positionX: Number(row.position_x || 0),
    positionY: Number(row.position_y || 0),
    configuration: typeof row.configuration === 'string' ? JSON.parse(row.configuration) : (row.configuration || {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapEdgeRow(row: any): AutomationEdgeRecord {
  return {
    id: row.id,
    automationVersionId: row.automation_version_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    sourceHandle: row.source_handle || null,
    targetHandle: row.target_handle || null,
    conditionKey: row.condition_key || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapExecutionRow(row: any): AutomationExecutionRecord {
  if (!row) {
    return null as any;
  }
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    automationId: row.automation_id,
    automationVersionId: row.automation_version_id,
    triggerType: row.trigger_type,
    triggerEventId: row.trigger_event_id || null,
    idempotencyKey: row.idempotency_key || null,
    conversationId: row.conversation_id || null,
    contactId: row.contact_id || null,
    status: row.status as AutomationExecutionStatus,
    currentNodeId: row.current_node_id || null,
    startedAt: row.started_at ? (row.started_at instanceof Date ? row.started_at.toISOString() : String(row.started_at)) : null,
    completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : String(row.completed_at)) : null,
    failedAt: row.failed_at ? (row.failed_at instanceof Date ? row.failed_at.toISOString() : String(row.failed_at)) : null,
    errorCode: row.error_code || null,
    errorMessage: row.error_message || null,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapExecutionStepRow(row: any): AutomationExecutionStepRecord {
  return {
    id: row.id,
    executionId: row.execution_id,
    nodeId: row.node_id,
    status: row.status as AutomationExecutionStepStatus,
    input: typeof row.input === 'string' ? JSON.parse(row.input) : (row.input || {}),
    output: typeof row.output === 'string' ? JSON.parse(row.output) : (row.output || {}),
    errorCode: row.error_code || null,
    errorMessage: row.error_message || null,
    startedAt: row.started_at ? (row.started_at instanceof Date ? row.started_at.toISOString() : String(row.started_at)) : null,
    completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : String(row.completed_at)) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export class AutomationDomainService {
  // ==========================================================================
  // 1. AUTOMATION CRUD & TENANT ISOLATION
  // ==========================================================================

  /**
   * Create a new automation record.
   * Scoped strictly to workspace_id and project_id.
   * Automatically initializes Version 1 in DRAFT status.
   */
  async createAutomation(input: CreateAutomationInput): Promise<{
    automation: AutomationRecord;
    initialVersion: AutomationVersionRecord;
  }> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      name,
      description = null,
      status = 'DRAFT',
      createdBy = null,
    } = input;

    if (!workspaceId || !projectId) {
      throw new AutomationTenantViolationError();
    }

    // Insert automation
    const { rows: autoRows } = await sql`
      INSERT INTO automations (
        workspace_id,
        project_id,
        name,
        description,
        status,
        created_by
      ) VALUES (
        ${workspaceId},
        ${projectId},
        ${name},
        ${description},
        ${status},
        ${createdBy}
      )
      RETURNING *;
    `;
    const autoRow = autoRows[0];

    // Create initial Version 1 (DRAFT)
    const { rows: verRows } = await sql`
      INSERT INTO automation_versions (
        automation_id,
        version_number,
        status,
        created_by
      ) VALUES (
        ${autoRow.id},
        1,
        'DRAFT',
        ${createdBy}
      )
      RETURNING *;
    `;
    const verRow = verRows[0];

    // Set current_version_id
    await sql`
      UPDATE automations
      SET current_version_id = ${verRow.id}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${autoRow.id};
    `;
    autoRow.current_version_id = verRow.id;

    return {
      automation: mapAutomationRow(autoRow),
      initialVersion: mapVersionRow(verRow),
    };
  }

  /**
   * Retrieve an automation by ID.
   * Throws AutomationNotFoundError if it doesn't exist or doesn't belong to the tenant.
   */
  async getAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string
  ): Promise<AutomationRecord> {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT *
      FROM automations
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId};
    `;

    if (!rows || rows.length === 0) {
      // Check if it exists under another tenant to throw specific violation if appropriate
      const { rows: crossCheck } = await sql`
        SELECT id FROM automations WHERE id = ${automationId};
      `;
      if (crossCheck && crossCheck.length > 0) {
        throw new AutomationTenantViolationError();
      }
      throw new AutomationNotFoundError();
    }

    return mapAutomationRow(rows[0]);
  }

  /**
   * List automations scoped strictly to workspace_id and project_id.
   */
  async listAutomations(
    workspaceId: string,
    projectId: string,
    options?: {
      status?: AutomationStatus | 'ALL';
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ automations: AutomationRecord[]; total: number }> {
    await ensureCoreTables();
    const statusFilter = options?.status && options.status !== 'ALL' ? options.status : null;
    const includeArchived = options?.includeArchived ?? false;
    const limit = Math.min(Math.max(1, options?.limit || 50), 100);
    const offset = Math.max(0, options?.offset || 0);

    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int as total
      FROM automations
      WHERE workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND (${statusFilter}::text IS NULL OR status = ${statusFilter})
        AND (${includeArchived}::boolean = TRUE OR status != 'ARCHIVED');
    `;
    const total = countRows[0]?.total || 0;

    const { rows } = await sql`
      SELECT *
      FROM automations
      WHERE workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND (${statusFilter}::text IS NULL OR status = ${statusFilter})
        AND (${includeArchived}::boolean = TRUE OR status != 'ARCHIVED')
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return {
      automations: rows.map(mapAutomationRow),
      total,
    };
  }

  /**
   * Update automation properties (name, description, status, currentVersionId).
   */
  async updateAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string,
    input: UpdateAutomationInput
  ): Promise<AutomationRecord> {
    const existing = await this.getAutomation(workspaceId, projectId, automationId);

    const name = input.name !== undefined ? input.name : existing.name;
    const description = input.description !== undefined ? input.description : existing.description;
    const status = input.status !== undefined ? input.status : existing.status;
    const currentVersionId = input.currentVersionId !== undefined ? input.currentVersionId : existing.currentVersionId;

    const { rows } = await sql`
      UPDATE automations
      SET
        name = ${name},
        description = ${description},
        status = ${status},
        current_version_id = ${currentVersionId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING *;
    `;

    return mapAutomationRow(rows[0]);
  }

  /**
   * Soft-delete / archive an automation.
   */
  async archiveAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string
  ): Promise<AutomationRecord> {
    await this.getAutomation(workspaceId, projectId, automationId);

    const { rows } = await sql`
      UPDATE automations
      SET
        status = 'ARCHIVED',
        archived_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING *;
    `;

    return mapAutomationRow(rows[0]);
  }

  // ==========================================================================
  // 2. AUTOMATION VERSIONS & IMMUTABILITY
  // ==========================================================================

  /**
   * Get an automation version by ID, validating parent tenant scoping.
   */
  async getVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<AutomationVersionRecord> {
    await this.getAutomation(workspaceId, projectId, automationId);

    const { rows } = await sql`
      SELECT *
      FROM automation_versions
      WHERE id = ${versionId}
        AND automation_id = ${automationId};
    `;

    if (!rows || rows.length === 0) {
      throw new AutomationVersionNotFoundError();
    }

    return mapVersionRow(rows[0]);
  }

  /**
   * List all versions for an automation.
   */
  async listVersions(
    workspaceId: string,
    projectId: string,
    automationId: string
  ): Promise<AutomationVersionRecord[]> {
    await this.getAutomation(workspaceId, projectId, automationId);

    const { rows } = await sql`
      SELECT *
      FROM automation_versions
      WHERE automation_id = ${automationId}
      ORDER BY version_number DESC;
    `;

    return rows.map(mapVersionRow);
  }

  /**
   * Assert that an automation version is mutable (i.e. status === 'DRAFT').
   * Published or archived versions CANNOT be modified directly.
   */
  async assertVersionMutable(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<AutomationVersionRecord> {
    const version = await this.getVersion(workspaceId, projectId, automationId, versionId);
    if (version.status !== 'DRAFT') {
      throw new AutomationVersionImmutableError(
        `Version ${version.versionNumber} is ${version.status} and cannot be edited directly. Create a new draft version.`
      );
    }
    return version;
  }

  /**
   * Create a new draft version, automatically computing next version_number.
   * If cloneFromVersionId is given, copies all nodes and edges from that version.
   */
  async createDraftVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    input?: CreateVersionInput
  ): Promise<AutomationVersionRecord> {
    await this.getAutomation(workspaceId, projectId, automationId);

    // Compute next version_number
    const { rows: maxRows } = await sql`
      SELECT COALESCE(MAX(version_number), 0)::int as max_version
      FROM automation_versions
      WHERE automation_id = ${automationId};
    `;
    const nextVersionNumber = (maxRows[0]?.max_version || 0) + 1;

    const { rows: verRows } = await sql`
      INSERT INTO automation_versions (
        automation_id,
        version_number,
        status,
        created_by
      ) VALUES (
        ${automationId},
        ${nextVersionNumber},
        'DRAFT',
        ${input?.createdBy || null}
      )
      RETURNING *;
    `;
    const newVersion = mapVersionRow(verRows[0]);

    // Optional: clone nodes & edges from existing version
    if (input?.cloneFromVersionId) {
      const sourceVersion = await this.getVersion(
        workspaceId,
        projectId,
        automationId,
        input.cloneFromVersionId
      );

      const sourceNodes = await this.getNodes(
        workspaceId,
        projectId,
        automationId,
        sourceVersion.id
      );
      const sourceEdges = await this.getEdges(
        workspaceId,
        projectId,
        automationId,
        sourceVersion.id
      );

      const nodeIdMap = new Map<string, string>();

      for (const node of sourceNodes) {
        const { rows: clonedNodeRows } = await sql`
          INSERT INTO automation_nodes (
            automation_version_id,
            node_key,
            type,
            label,
            position_x,
            position_y,
            configuration
          ) VALUES (
            ${newVersion.id},
            ${node.nodeKey},
            ${node.type},
            ${node.label},
            ${node.positionX},
            ${node.positionY},
            ${JSON.stringify(node.configuration)}::jsonb
          )
          RETURNING id;
        `;
        nodeIdMap.set(node.id, clonedNodeRows[0].id);
      }

      for (const edge of sourceEdges) {
        const newSourceId = nodeIdMap.get(edge.sourceNodeId);
        const newTargetId = nodeIdMap.get(edge.targetNodeId);

        if (newSourceId && newTargetId) {
          await sql`
            INSERT INTO automation_edges (
              automation_version_id,
              source_node_id,
              target_node_id,
              source_handle,
              target_handle,
              condition_key
            ) VALUES (
              ${newVersion.id},
              ${newSourceId},
              ${newTargetId},
              ${edge.sourceHandle},
              ${edge.targetHandle},
              ${edge.conditionKey}
            );
          `;
        }
      }
    }

    return newVersion;
  }

  /**
   * Publish a version.
   * Marks status as 'PUBLISHED', sets published_at timestamp, and updates automation current_version_id.
   */
  async publishVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<AutomationVersionRecord> {
    await this.getVersion(workspaceId, projectId, automationId, versionId);

    const { rows: verRows } = await sql`
      UPDATE automation_versions
      SET
        status = 'PUBLISHED',
        published_at = CURRENT_TIMESTAMP
      WHERE id = ${versionId}
        AND automation_id = ${automationId}
      RETURNING *;
    `;

    // Set automation current_version_id and make automation ACTIVE if it was DRAFT
    await sql`
      UPDATE automations
      SET
        current_version_id = ${versionId},
        status = CASE WHEN status = 'DRAFT' THEN 'ACTIVE' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId};
    `;

    return mapVersionRow(verRows[0]);
  }

  /**
   * Archive a version.
   */
  async archiveVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<AutomationVersionRecord> {
    await this.getVersion(workspaceId, projectId, automationId, versionId);

    const { rows } = await sql`
      UPDATE automation_versions
      SET status = 'ARCHIVED'
      WHERE id = ${versionId}
        AND automation_id = ${automationId}
      RETURNING *;
    `;

    return mapVersionRow(rows[0]);
  }

  // ==========================================================================
  // 3. AUTOMATION NODES
  // ==========================================================================

  /**
   * List nodes for a version.
   */
  async getNodes(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<AutomationNodeRecord[]> {
    await this.getVersion(workspaceId, projectId, automationId, versionId);

    const { rows } = await sql`
      SELECT *
      FROM automation_nodes
      WHERE automation_version_id = ${versionId}
      ORDER BY created_at ASC;
    `;

    return rows.map(mapNodeRow);
  }

  /**
   * Create a node inside an automation version.
   * Enforces version mutability and unique node_key constraint.
   */
  async createNode(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string,
    input: CreateNodeInput
  ): Promise<AutomationNodeRecord> {
    await this.assertVersionMutable(workspaceId, projectId, automationId, versionId);

    // Verify node_key uniqueness inside version
    const { rows: existingNode } = await sql`
      SELECT id FROM automation_nodes
      WHERE automation_version_id = ${versionId}
        AND node_key = ${input.nodeKey};
    `;
    if (existingNode && existingNode.length > 0) {
      throw new AutomationNodeDuplicateKeyError(input.nodeKey);
    }

    const { rows } = await sql`
      INSERT INTO automation_nodes (
        automation_version_id,
        node_key,
        type,
        label,
        position_x,
        position_y,
        configuration
      ) VALUES (
        ${versionId},
        ${input.nodeKey},
        ${input.type},
        ${input.label},
        ${input.positionX ?? 0},
        ${input.positionY ?? 0},
        ${JSON.stringify(input.configuration || {})}::jsonb
      )
      RETURNING *;
    `;

    return mapNodeRow(rows[0]);
  }

  /**
   * Update node configuration, label, or position.
   * Enforces version mutability.
   */
  async updateNode(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string,
    nodeId: string,
    input: UpdateNodeInput
  ): Promise<AutomationNodeRecord> {
    await this.assertVersionMutable(workspaceId, projectId, automationId, versionId);

    const { rows: existing } = await sql`
      SELECT * FROM automation_nodes
      WHERE id = ${nodeId} AND automation_version_id = ${versionId};
    `;
    if (!existing || existing.length === 0) {
      throw new Error('Automation node not found.');
    }
    const current = existing[0];

    const label = input.label !== undefined ? input.label : current.label;
    const type = input.type !== undefined ? input.type : current.type;
    const positionX = input.positionX !== undefined ? input.positionX : current.position_x;
    const positionY = input.positionY !== undefined ? input.positionY : current.position_y;
    const configuration = input.configuration !== undefined
      ? JSON.stringify(input.configuration)
      : JSON.stringify(current.configuration);

    const { rows } = await sql`
      UPDATE automation_nodes
      SET
        label = ${label},
        type = ${type},
        position_x = ${positionX},
        position_y = ${positionY},
        configuration = ${configuration}::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${nodeId}
        AND automation_version_id = ${versionId}
      RETURNING *;
    `;

    return mapNodeRow(rows[0]);
  }

  /**
   * Delete a node from an automation version.
   * Enforces version mutability.
   */
  async deleteNode(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string,
    nodeId: string
  ): Promise<void> {
    await this.assertVersionMutable(workspaceId, projectId, automationId, versionId);

    await sql`
      DELETE FROM automation_nodes
      WHERE id = ${nodeId}
        AND automation_version_id = ${versionId};
    `;
  }

  // ==========================================================================
  // 4. AUTOMATION EDGES
  // ==========================================================================

  /**
   * List edges for a version.
   */
  async getEdges(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<AutomationEdgeRecord[]> {
    await this.getVersion(workspaceId, projectId, automationId, versionId);

    const { rows } = await sql`
      SELECT *
      FROM automation_edges
      WHERE automation_version_id = ${versionId}
      ORDER BY created_at ASC;
    `;

    return rows.map(mapEdgeRow);
  }

  /**
   * Create an edge connecting two nodes inside an automation version.
   * Validates that both source and target nodes belong to this version.
   */
  async createEdge(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string,
    input: CreateEdgeInput
  ): Promise<AutomationEdgeRecord> {
    await this.assertVersionMutable(workspaceId, projectId, automationId, versionId);

    // Verify source and target nodes belong to version
    const { rows: sourceCheck } = await sql`
      SELECT id FROM automation_nodes
      WHERE id = ${input.sourceNodeId} AND automation_version_id = ${versionId};
    `;
    const { rows: targetCheck } = await sql`
      SELECT id FROM automation_nodes
      WHERE id = ${input.targetNodeId} AND automation_version_id = ${versionId};
    `;

    if (!sourceCheck || sourceCheck.length === 0 || !targetCheck || targetCheck.length === 0) {
      throw new AutomationEdgeInvalidNodeError(
        'Both source and target nodes must exist within the target automation version.'
      );
    }

    const { rows } = await sql`
      INSERT INTO automation_edges (
        automation_version_id,
        source_node_id,
        target_node_id,
        source_handle,
        target_handle,
        condition_key
      ) VALUES (
        ${versionId},
        ${input.sourceNodeId},
        ${input.targetNodeId},
        ${input.sourceHandle || null},
        ${input.targetHandle || null},
        ${input.conditionKey || null}
      )
      RETURNING *;
    `;

    return mapEdgeRow(rows[0]);
  }

  /**
   * Delete an edge from an automation version.
   */
  async deleteEdge(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string,
    edgeId: string
  ): Promise<void> {
    await this.assertVersionMutable(workspaceId, projectId, automationId, versionId);

    await sql`
      DELETE FROM automation_edges
      WHERE id = ${edgeId}
        AND automation_version_id = ${versionId};
    `;
  }

  // ==========================================================================
  // 5. AUTOMATION EXECUTIONS & IDEMPOTENCY
  // ==========================================================================

  /**
   * Create an automation execution.
   * Enforces multi-tenant isolation and idempotency protection.
   * If idempotencyKey exists for this workspace and project:
   *   - If throwOnDuplicateIdempotency is true, throws AutomationIdempotencyConflictError
   *   - Otherwise, returns existing execution (safe idempotent deduplication).
   */
  async createExecution(
    input: CreateExecutionInput,
    options?: { throwOnDuplicateIdempotency?: boolean }
  ): Promise<{ execution: AutomationExecutionRecord; isDuplicate: boolean }> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      automationId,
      automationVersionId,
      triggerType,
      triggerEventId = null,
      idempotencyKey = null,
      conversationId = null,
      contactId = null,
      currentNodeId = null,
      metadata = {},
    } = input;

    // Validate tenant ownership of automation
    await this.getAutomation(workspaceId, projectId, automationId);

    // Check idempotency if key provided
    if (idempotencyKey) {
      const { rows: existing } = await sql`
        SELECT *
        FROM automation_executions
        WHERE workspace_id = ${workspaceId}
          AND project_id = ${projectId}
          AND idempotency_key = ${idempotencyKey};
      `;

      if (existing && existing.length > 0) {
        if (options?.throwOnDuplicateIdempotency) {
          throw new AutomationIdempotencyConflictError(idempotencyKey);
        }
        return {
          execution: mapExecutionRow(existing[0]),
          isDuplicate: true,
        };
      }
    }

    const { rows } = await sql`
      INSERT INTO automation_executions (
        workspace_id,
        project_id,
        automation_id,
        automation_version_id,
        trigger_type,
        trigger_event_id,
        idempotency_key,
        conversation_id,
        contact_id,
        status,
        current_node_id,
        metadata
      ) VALUES (
        ${workspaceId},
        ${projectId},
        ${automationId},
        ${automationVersionId},
        ${triggerType},
        ${triggerEventId},
        ${idempotencyKey},
        ${conversationId},
        ${contactId},
        'QUEUED',
        ${currentNodeId},
        ${JSON.stringify(metadata)}::jsonb
      )
      RETURNING *;
    `;

    return {
      execution: mapExecutionRow(rows[0]),
      isDuplicate: false,
    };
  }

  /**
   * Retrieve an execution by ID with strict tenant scoping.
   */
  async getExecution(
    workspaceId: string,
    projectId: string,
    executionId: string
  ): Promise<AutomationExecutionRecord> {
    await ensureCoreTables();
    const { rows } = await sql`
      SELECT *
      FROM automation_executions
      WHERE id = ${executionId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId};
    `;

    if (!rows || rows.length === 0) {
      throw new Error('Automation execution not found.');
    }

    return mapExecutionRow(rows[0]);
  }

  /**
   * List executions for a workspace and project.
   */
  async listExecutions(
    workspaceId: string,
    projectId: string,
    options?: {
      automationId?: string;
      status?: AutomationExecutionStatus;
      triggerEventId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ executions: AutomationExecutionRecord[]; total: number }> {
    await ensureCoreTables();
    const automationId = options?.automationId || null;
    const status = options?.status || null;
    const triggerEventId = options?.triggerEventId || null;
    const limit = Math.min(Math.max(1, options?.limit || 50), 100);
    const offset = Math.max(0, options?.offset || 0);

    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int as total
      FROM automation_executions
      WHERE workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND (${automationId}::uuid IS NULL OR automation_id = ${automationId})
        AND (${status}::text IS NULL OR status = ${status})
        AND (${triggerEventId}::text IS NULL OR trigger_event_id = ${triggerEventId});
    `;
    const total = countRows[0]?.total || 0;

    const { rows } = await sql`
      SELECT *
      FROM automation_executions
      WHERE workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND (${automationId}::uuid IS NULL OR automation_id = ${automationId})
        AND (${status}::text IS NULL OR status = ${status})
        AND (${triggerEventId}::text IS NULL OR trigger_event_id = ${triggerEventId})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return {
      executions: rows.map(mapExecutionRow),
      total,
    };
  }

  /**
   * Update execution state and status.
   */
  async updateExecutionStatus(
    workspaceId: string,
    projectId: string,
    executionId: string,
    updates: {
      status: AutomationExecutionStatus;
      currentNodeId?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
      startedAt?: string | null;
      completedAt?: string | null;
      failedAt?: string | null;
      metadata?: Record<string, any>;
    }
  ): Promise<AutomationExecutionRecord> {
    await this.getExecution(workspaceId, projectId, executionId);

    const { rows } = await sql`
      UPDATE automation_executions
      SET
        status = ${updates.status},
        current_node_id = COALESCE(${updates.currentNodeId}, current_node_id),
        error_code = COALESCE(${updates.errorCode}, error_code),
        error_message = COALESCE(${updates.errorMessage}, error_message),
        started_at = CASE 
          WHEN ${updates.status} = 'RUNNING' AND started_at IS NULL THEN CURRENT_TIMESTAMP
          ELSE started_at
        END,
        completed_at = CASE 
          WHEN ${updates.status} = 'COMPLETED' THEN CURRENT_TIMESTAMP
          ELSE completed_at
        END,
        failed_at = CASE 
          WHEN ${updates.status} = 'FAILED' THEN CURRENT_TIMESTAMP
          ELSE failed_at
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${executionId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING *;
    `;

    return mapExecutionRow(rows[0]);
  }

  // ==========================================================================
  // 6. EXECUTION STEPS
  // ==========================================================================

  /**
   * Record an execution step.
   */
  async createExecutionStep(
    workspaceId: string,
    projectId: string,
    input: CreateExecutionStepInput
  ): Promise<AutomationExecutionStepRecord> {
    // Validate that execution belongs to tenant
    await this.getExecution(workspaceId, projectId, input.executionId);

    const { rows } = await sql`
      INSERT INTO automation_execution_steps (
        execution_id,
        node_id,
        status,
        input,
        output,
        error_code,
        error_message,
        started_at,
        completed_at
      ) VALUES (
        ${input.executionId},
        ${input.nodeId},
        ${input.status || 'PENDING'},
        ${JSON.stringify(input.input || {})}::jsonb,
        ${JSON.stringify(input.output || {})}::jsonb,
        ${input.errorCode || null},
        ${input.errorMessage || null},
        ${input.startedAt ? new Date(input.startedAt).toISOString() : null},
        ${input.completedAt ? new Date(input.completedAt).toISOString() : null}
      )
      RETURNING *;
    `;

    return mapExecutionStepRow(rows[0]);
  }

  /**
   * Update an execution step status and outputs.
   */
  async updateExecutionStep(
    stepId: string,
    updates: {
      status: AutomationExecutionStepStatus;
      output?: Record<string, any>;
      errorCode?: string | null;
      errorMessage?: string | null;
      completedAt?: string | null;
    }
  ): Promise<AutomationExecutionStepRecord> {
    const { rows } = await sql`
      UPDATE automation_execution_steps
      SET
        status = ${updates.status},
        output = CASE 
          WHEN ${updates.output !== undefined} THEN ${JSON.stringify(updates.output || {})}::jsonb
          ELSE output
        END,
        error_code = COALESCE(${updates.errorCode}, error_code),
        error_message = COALESCE(${updates.errorMessage}, error_message),
        completed_at = CASE 
          WHEN ${updates.status} IN ('COMPLETED', 'FAILED', 'SKIPPED') THEN CURRENT_TIMESTAMP
          ELSE completed_at
        END
      WHERE id = ${stepId}
      RETURNING *;
    `;

    if (!rows || rows.length === 0) {
      throw new Error('Automation execution step not found.');
    }

    return mapExecutionStepRow(rows[0]);
  }

  /**
   * List all execution steps for a given execution.
   */
  async listExecutionSteps(
    workspaceId: string,
    projectId: string,
    executionId: string
  ): Promise<AutomationExecutionStepRecord[]> {
    await this.getExecution(workspaceId, projectId, executionId);

    const { rows } = await sql`
      SELECT *
      FROM automation_execution_steps
      WHERE execution_id = ${executionId}
      ORDER BY created_at ASC;
    `;

    return rows.map(mapExecutionStepRow);
  }
}

export const automationDomainService = new AutomationDomainService();
