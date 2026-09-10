import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { recordAuditLog } from '@/lib/services/audit/auditLogger';
import {
  AutomationRecord,
  AutomationVersionRecord,
  AutomationNodeRecord,
  AutomationEdgeRecord,
  AutomationStatus,
  AutomationNotFoundError,
  AutomationTenantViolationError,
  AutomationEdgeInvalidNodeError,
  AutomationDuplicateNameError,
} from './types';
import { automationDomainService } from './automationDomainService';
import { automationScheduleService } from './automationScheduleService';

export interface AutomationDetails extends AutomationRecord {
  currentVersion?: AutomationVersionRecord | null;
  draftVersion?: AutomationVersionRecord | null;
  nodes?: AutomationNodeRecord[];
  edges?: AutomationEdgeRecord[];
  executions?: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    triggerSource: string | null;
    errorMessage: string | null;
  }>;
  nodeCount?: number;
  triggerType?: string | null;
  lastRunAt?: string | null;
}

export interface VersionGraphDetails extends AutomationVersionRecord {
  nodes: AutomationNodeRecord[];
  edges: AutomationEdgeRecord[];
}

export class AutomationService {
  // ==========================================================================
  // 1. AUTOMATION OPERATIONS
  // ==========================================================================

  /**
   * List automations scoped strictly to workspace_id and project_id.
   * Supports filtering by status, search, and pagination.
   * Default ordering: updated_at DESC.
   */
  async listAutomations(options: {
    workspaceId: string;
    projectId: string;
    status?: AutomationStatus | 'ALL';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ automations: AutomationDetails[]; totalCount: number }> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      status = 'ALL',
      search,
      limit = 50,
      offset = 0,
    } = options;

    const pageSize = Math.min(Math.max(1, limit), 100);
    const pageOffset = Math.max(0, offset);
    const searchParam = search && search.trim() ? `%${search.trim().toLowerCase()}%` : null;
    const statusFilter = status && status !== 'ALL' ? status : null;

    // Count query
    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int as total
      FROM automations a
      WHERE a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId}
        AND (
          CASE 
            WHEN ${statusFilter}::text = 'ARCHIVED' THEN a.status = 'ARCHIVED'
            WHEN ${statusFilter}::text IS NOT NULL THEN a.status = ${statusFilter}
            ELSE a.status != 'ARCHIVED'
          END
        )
        AND (
          ${searchParam}::text IS NULL OR
          LOWER(a.name) LIKE ${searchParam} OR
          LOWER(COALESCE(a.description, '')) LIKE ${searchParam}
        );
    `;
    const totalCount = countRows[0]?.total || 0;

    // Select query
    const { rows } = await sql`
      SELECT 
        a.id, a.workspace_id, a.project_id, a.name, a.description, a.status,
        a.current_version_id, a.created_by, a.created_at, a.updated_at, a.archived_at,
        cv.version_number as current_version_number,
        cv.status as current_version_status,
        cv.published_at as current_version_published_at,
        (
          SELECT COUNT(*)::int
          FROM automation_nodes n
          WHERE n.automation_version_id = a.current_version_id
        ) as node_count,
        (
          SELECT n.type
          FROM automation_nodes n
          WHERE n.automation_version_id = a.current_version_id
            AND (n.type LIKE 'trigger%' OR n.type = 'trigger')
          LIMIT 1
        ) as trigger_type,
        (
          SELECT e.started_at
          FROM automation_executions e
          WHERE e.automation_id = a.id
          ORDER BY e.created_at DESC
          LIMIT 1
        ) as last_run_at
      FROM automations a
      LEFT JOIN automation_versions cv ON a.current_version_id = cv.id
      WHERE a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId}
        AND (
          CASE 
            WHEN ${statusFilter}::text = 'ARCHIVED' THEN a.status = 'ARCHIVED'
            WHEN ${statusFilter}::text IS NOT NULL THEN a.status = ${statusFilter}
            ELSE a.status != 'ARCHIVED'
          END
        )
        AND (
          ${searchParam}::text IS NULL OR
          LOWER(a.name) LIKE ${searchParam} OR
          LOWER(COALESCE(a.description, '')) LIKE ${searchParam}
        )
      ORDER BY a.updated_at DESC
      LIMIT ${pageSize} OFFSET ${pageOffset};
    `;

    const automations: AutomationDetails[] = rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      description: r.description || null,
      status: r.status as AutomationStatus,
      currentVersionId: r.current_version_id || null,
      createdBy: r.created_by || null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
      archivedAt: r.archived_at ? (r.archived_at instanceof Date ? r.archived_at.toISOString() : String(r.archived_at)) : null,
      currentVersion: r.current_version_id
        ? {
            id: r.current_version_id,
            automationId: r.id,
            versionNumber: Number(r.current_version_number || 1),
            status: r.current_version_status,
            createdBy: null as string | null,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
            publishedAt: r.current_version_published_at ? (r.current_version_published_at instanceof Date ? r.current_version_published_at.toISOString() : String(r.current_version_published_at)) : null,
          }
        : null,
      nodeCount: Number(r.node_count || 0),
      triggerType: r.trigger_type || null,
      lastRunAt: r.last_run_at ? (r.last_run_at instanceof Date ? r.last_run_at.toISOString() : String(r.last_run_at)) : null,
    }));

    return { automations, totalCount };
  }

  /**
   * Retrieve a single automation by ID, including its current and latest draft versions.
   */
  async getAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string
  ): Promise<AutomationDetails> {
    await ensureCoreTables();

    const { rows } = await sql`
      SELECT 
        a.id, a.workspace_id, a.project_id, a.name, a.description, a.status,
        a.current_version_id, a.created_by, a.created_at, a.updated_at, a.archived_at
      FROM automations a
      WHERE a.id = ${automationId}
        AND a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId};
    `;

    if (!rows || rows.length === 0) {
      // Check cross-tenant existence
      const { rows: cross } = await sql`
        SELECT id FROM automations WHERE id = ${automationId};
      `;
      if (cross && cross.length > 0) {
        throw new AutomationTenantViolationError();
      }
      throw new AutomationNotFoundError();
    }

    const r = rows[0];

    // Fetch current version if present
    let currentVersion: AutomationVersionRecord | null = null;
    if (r.current_version_id) {
      const { rows: cvRows } = await sql`
        SELECT * FROM automation_versions WHERE id = ${r.current_version_id};
      `;
      if (cvRows.length > 0) {
        const cv = cvRows[0];
        currentVersion = {
          id: cv.id,
          automationId: cv.automation_id,
          versionNumber: Number(cv.version_number),
          status: cv.status,
          createdBy: cv.created_by || null,
          createdAt: cv.created_at instanceof Date ? cv.created_at.toISOString() : String(cv.created_at),
          publishedAt: cv.published_at ? (cv.published_at instanceof Date ? cv.published_at.toISOString() : String(cv.published_at)) : null,
        };
      }
    }

    // Fetch latest draft version if present
    let draftVersion: AutomationVersionRecord | null = null;
    const { rows: dvRows } = await sql`
      SELECT * FROM automation_versions 
      WHERE automation_id = ${automationId} AND status = 'DRAFT'
      ORDER BY version_number DESC
      LIMIT 1;
    `;
    if (dvRows.length > 0) {
      const dv = dvRows[0];
      draftVersion = {
        id: dv.id,
        automationId: dv.automation_id,
        versionNumber: Number(dv.version_number),
        status: dv.status,
        createdBy: dv.created_by || null,
        createdAt: dv.created_at instanceof Date ? dv.created_at.toISOString() : String(dv.created_at),
        publishedAt: null,
      };
    }

    const targetVersionId = draftVersion?.id || r.current_version_id || null;

    let nodes: AutomationNodeRecord[] = [];
    let edges: AutomationEdgeRecord[] = [];

    if (targetVersionId) {
      const { rows: nodeRows } = await sql`
        SELECT * FROM automation_nodes WHERE automation_version_id = ${targetVersionId};
      `;
      nodes = (nodeRows || []).map((n: any) => ({
        id: n.id,
        automationVersionId: n.automation_version_id,
        nodeKey: n.node_key,
        type: n.type || n.node_type || 'action',
        label: n.label,
        positionX: Number(n.position_x || 0),
        positionY: Number(n.position_y || 0),
        configuration: typeof n.configuration === 'string'
          ? JSON.parse(n.configuration)
          : (n.configuration || (typeof n.config === 'string' ? JSON.parse(n.config) : (n.config || {}))),
        createdAt: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
        updatedAt: n.updated_at instanceof Date ? n.updated_at.toISOString() : String(n.updated_at || n.created_at),
      }));

      const { rows: edgeRows } = await sql`
        SELECT * FROM automation_edges WHERE automation_version_id = ${targetVersionId};
      `;
      edges = (edgeRows || []).map((e: any) => ({
        id: e.id,
        automationVersionId: e.automation_version_id,
        sourceNodeId: e.source_node_id,
        targetNodeId: e.target_node_id,
        sourceHandle: e.source_handle || null,
        targetHandle: e.target_handle || null,
        conditionKey: e.condition_key || e.condition_branch || null,
        createdAt: e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at),
      }));
    }

    // Fetch recent executions
    const { rows: execRows } = await sql`
      SELECT id, status, started_at, completed_at, trigger_source, error_message
      FROM automation_executions
      WHERE automation_id = ${automationId}
      ORDER BY started_at DESC
      LIMIT 10;
    `;
    const executions = (execRows || []).map((ex: any) => ({
      id: ex.id,
      status: ex.status,
      startedAt: ex.started_at instanceof Date ? ex.started_at.toISOString() : String(ex.started_at),
      completedAt: ex.completed_at ? (ex.completed_at instanceof Date ? ex.completed_at.toISOString() : String(ex.completed_at)) : null,
      triggerSource: ex.trigger_source || null,
      errorMessage: ex.error_message || null,
    }));

    return {
      id: r.id,
      workspaceId: r.workspace_id,
      projectId: r.project_id,
      name: r.name,
      description: r.description || null,
      status: r.status as AutomationStatus,
      currentVersionId: r.current_version_id || null,
      createdBy: r.created_by || null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
      archivedAt: r.archived_at ? (r.archived_at instanceof Date ? r.archived_at.toISOString() : String(r.archived_at)) : null,
      currentVersion,
      draftVersion,
      nodes,
      edges,
      executions,
      nodeCount: nodes.length,
    };
  }

  /**
   * Create an automation and initial draft version in a single database transaction.
   * Records audit log: automation.created.
   */
  async createAutomation(input: {
    workspaceId: string;
    projectId: string;
    name: string;
    description?: string | null;
    userId?: string | null;
  }): Promise<{
    automation: AutomationRecord;
    draftVersion: AutomationVersionRecord;
  }> {
    await ensureCoreTables();
    const { workspaceId, projectId, name, description = null, userId = null } = input;

    if (!workspaceId || !projectId) {
      throw new AutomationTenantViolationError();
    }

    // Check if an automation with the same name already exists in this project
    const { rows: existingRows } = await sql`
      SELECT id FROM automations
      WHERE workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND LOWER(name) = LOWER(${name})
        AND status != 'ARCHIVED';
    `;
    if (existingRows && existingRows.length > 0) {
      throw new AutomationDuplicateNameError(
        `An automation named "${name}" already exists in this project.`
      );
    }

    try {
      await (sql as any).query('BEGIN');

      // 1. Insert automation
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
          'DRAFT',
          ${userId}
        )
        RETURNING *;
      `;
      const autoRow = autoRows[0];

      // 2. Insert initial draft Version 1
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
          ${userId}
        )
        RETURNING *;
      `;
      const verRow = verRows[0];

      // 3. Link current_version_id
      await sql`
        UPDATE automations
        SET current_version_id = ${verRow.id}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${autoRow.id};
      `;
      autoRow.current_version_id = verRow.id;

      await (sql as any).query('COMMIT');

      const automation: AutomationRecord = {
        id: autoRow.id,
        workspaceId: autoRow.workspace_id,
        projectId: autoRow.project_id,
        name: autoRow.name,
        description: autoRow.description || null,
        status: autoRow.status as AutomationStatus,
        currentVersionId: verRow.id,
        createdBy: autoRow.created_by || null,
        createdAt: autoRow.created_at instanceof Date ? autoRow.created_at.toISOString() : String(autoRow.created_at),
        updatedAt: autoRow.updated_at instanceof Date ? autoRow.updated_at.toISOString() : String(autoRow.updated_at),
        archivedAt: null,
      };

      const draftVersion: AutomationVersionRecord = {
        id: verRow.id,
        automationId: verRow.automation_id,
        versionNumber: 1,
        status: 'DRAFT',
        createdBy: verRow.created_by || null,
        createdAt: verRow.created_at instanceof Date ? verRow.created_at.toISOString() : String(verRow.created_at),
        publishedAt: null,
      };

      // Record audit logs
      await recordAuditLog({
        workspaceId,
        projectId,
        userId,
        action: 'automation.created',
        entityType: 'automation',
        entityId: automation.id,
        newValues: { name: automation.name, description: automation.description },
      });

      await recordAuditLog({
        workspaceId,
        projectId,
        userId,
        action: 'automation.version.created',
        entityType: 'automation_version',
        entityId: draftVersion.id,
        newValues: { versionNumber: 1, status: 'DRAFT', automationId: automation.id },
      });

      return { automation, draftVersion };
    } catch (err) {
      try {
        await (sql as any).query('ROLLBACK');
      } catch {
        // Ignored
      }
      throw err;
    }
  }

  /**
   * Update automation metadata (name, description).
   * Prevents modifying workspaceId, projectId, createdBy, or currentVersionId.
   * Records audit log: automation.updated.
   */
  async updateAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string,
    input: { name?: string; description?: string | null },
    userId?: string | null
  ): Promise<AutomationRecord> {
    const existing = await automationDomainService.getAutomation(workspaceId, projectId, automationId);

    const name = input.name !== undefined ? input.name : existing.name;
    const description = input.description !== undefined ? input.description : existing.description;

    const { rows } = await sql`
      UPDATE automations
      SET
        name = ${name},
        description = ${description},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING *;
    `;

    const updated = rows[0];
    const record: AutomationRecord = {
      id: updated.id,
      workspaceId: updated.workspace_id,
      projectId: updated.project_id,
      name: updated.name,
      description: updated.description || null,
      status: updated.status as AutomationStatus,
      currentVersionId: updated.current_version_id || null,
      createdBy: updated.created_by || null,
      createdAt: updated.created_at instanceof Date ? updated.created_at.toISOString() : String(updated.created_at),
      updatedAt: updated.updated_at instanceof Date ? updated.updated_at.toISOString() : String(updated.updated_at),
      archivedAt: updated.archived_at ? (updated.archived_at instanceof Date ? updated.archived_at.toISOString() : String(updated.archived_at)) : null,
    };

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'automation.updated',
      entityType: 'automation',
      entityId: automationId,
      oldValues: { name: existing.name, description: existing.description },
      newValues: { name: record.name, description: record.description },
    });

    return record;
  }

  /**
   * Duplicate an automation workflow and clone its active/draft version graph.
   * Records audit log: automation.created.
   */
  async duplicateAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string,
    userId?: string | null
  ): Promise<{
    automation: AutomationRecord;
    draftVersion: AutomationVersionRecord;
  }> {
    const source = await this.getAutomation(workspaceId, projectId, automationId);
    const sourceVersionId = source.currentVersionId || source.draftVersion?.id;

    if (!sourceVersionId) {
      throw new Error('Source automation does not have a valid version to duplicate.');
    }

    try {
      await (sql as any).query('BEGIN');

      const newName = `${source.name} (Copy)`;

      // 1. Insert duplicated automation
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
          ${newName},
          ${source.description},
          'DRAFT',
          ${userId}
        )
        RETURNING *;
      `;
      const autoRow = autoRows[0];

      // 2. Insert duplicated Version 1
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
          ${userId}
        )
        RETURNING *;
      `;
      const verRow = verRows[0];

      // 3. Link current_version_id
      await sql`
        UPDATE automations
        SET current_version_id = ${verRow.id}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${autoRow.id};
      `;

      // 4. Clone nodes & edges from source version
      const sourceNodes = await automationDomainService.getNodes(
        workspaceId,
        projectId,
        automationId,
        sourceVersionId
      );
      const sourceEdges = await automationDomainService.getEdges(
        workspaceId,
        projectId,
        automationId,
        sourceVersionId
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
            ${verRow.id},
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
              ${verRow.id},
              ${newSourceId},
              ${newTargetId},
              ${edge.sourceHandle},
              ${edge.targetHandle},
              ${edge.conditionKey}
            );
          `;
        }
      }

      await (sql as any).query('COMMIT');

      const automation: AutomationRecord = {
        id: autoRow.id,
        workspaceId: autoRow.workspace_id,
        projectId: autoRow.project_id,
        name: newName,
        description: source.description,
        status: 'DRAFT',
        currentVersionId: verRow.id,
        createdBy: userId,
        createdAt: autoRow.created_at instanceof Date ? autoRow.created_at.toISOString() : String(autoRow.created_at),
        updatedAt: autoRow.updated_at instanceof Date ? autoRow.updated_at.toISOString() : String(autoRow.updated_at),
        archivedAt: null,
      };

      const draftVersion: AutomationVersionRecord = {
        id: verRow.id,
        automationId: verRow.automation_id,
        versionNumber: 1,
        status: 'DRAFT',
        createdBy: userId,
        createdAt: verRow.created_at instanceof Date ? verRow.created_at.toISOString() : String(verRow.created_at),
        publishedAt: null,
      };

      await recordAuditLog({
        workspaceId,
        projectId,
        userId,
        action: 'automation.created',
        entityType: 'automation',
        entityId: automation.id,
        newValues: { name: automation.name, duplicatedFrom: automationId },
      });

      return { automation, draftVersion };
    } catch (err) {
      try {
        await (sql as any).query('ROLLBACK');
      } catch {
        // Ignored
      }
      throw err;
    }
  }

  /**
   * Archive an automation workflow.
   * Records audit log: automation.archived.
   */
  async archiveAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string,
    userId?: string | null
  ): Promise<AutomationRecord> {
    const existing = await automationDomainService.getAutomation(workspaceId, projectId, automationId);

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

    const record: AutomationRecord = {
      id: rows[0].id,
      workspaceId: rows[0].workspace_id,
      projectId: rows[0].project_id,
      name: rows[0].name,
      description: rows[0].description || null,
      status: 'ARCHIVED',
      currentVersionId: rows[0].current_version_id || null,
      createdBy: rows[0].created_by || null,
      createdAt: rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : String(rows[0].created_at),
      updatedAt: rows[0].updated_at instanceof Date ? rows[0].updated_at.toISOString() : String(rows[0].updated_at),
      archivedAt: rows[0].archived_at instanceof Date ? rows[0].archived_at.toISOString() : String(rows[0].archived_at),
    };

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'automation.archived',
      entityType: 'automation',
      entityId: automationId,
      oldValues: { status: existing.status },
      newValues: { status: 'ARCHIVED' },
    });

    await this.syncSchedule(workspaceId, projectId, automationId, null, false);

    return record;
  }

  /**
   * Activate an automation workflow.
   * Records audit log: automation.updated.
   */
  async activateAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string,
    userId?: string | null
  ): Promise<AutomationRecord> {
    const existing = await automationDomainService.getAutomation(workspaceId, projectId, automationId);

    const { rows } = await sql`
      UPDATE automations
      SET
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING *;
    `;

    const record: AutomationRecord = {
      id: rows[0].id,
      workspaceId: rows[0].workspace_id,
      projectId: rows[0].project_id,
      name: rows[0].name,
      description: rows[0].description || null,
      status: 'ACTIVE',
      currentVersionId: rows[0].current_version_id || null,
      createdBy: rows[0].created_by || null,
      createdAt: rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : String(rows[0].created_at),
      updatedAt: rows[0].updated_at instanceof Date ? rows[0].updated_at.toISOString() : String(rows[0].updated_at),
      archivedAt: rows[0].archived_at ? (rows[0].archived_at instanceof Date ? rows[0].archived_at.toISOString() : String(rows[0].archived_at)) : null,
    };

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'automation.updated',
      entityType: 'automation',
      entityId: automationId,
      oldValues: { status: existing.status },
      newValues: { status: 'ACTIVE' },
    });

    await this.syncSchedule(workspaceId, projectId, automationId, record.currentVersionId, true);

    return record;
  }

  /**
   * Pause an automation workflow.
   * Records audit log: automation.updated.
   */
  async pauseAutomation(
    workspaceId: string,
    projectId: string,
    automationId: string,
    userId?: string | null
  ): Promise<AutomationRecord> {
    const existing = await automationDomainService.getAutomation(workspaceId, projectId, automationId);

    const { rows } = await sql`
      UPDATE automations
      SET
        status = 'PAUSED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${automationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING *;
    `;

    const record: AutomationRecord = {
      id: rows[0].id,
      workspaceId: rows[0].workspace_id,
      projectId: rows[0].project_id,
      name: rows[0].name,
      description: rows[0].description || null,
      status: 'PAUSED',
      currentVersionId: rows[0].current_version_id || null,
      createdBy: rows[0].created_by || null,
      createdAt: rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : String(rows[0].created_at),
      updatedAt: rows[0].updated_at instanceof Date ? rows[0].updated_at.toISOString() : String(rows[0].updated_at),
      archivedAt: rows[0].archived_at ? (rows[0].archived_at instanceof Date ? rows[0].archived_at.toISOString() : String(rows[0].archived_at)) : null,
    };

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'automation.updated',
      entityType: 'automation',
      entityId: automationId,
      oldValues: { status: existing.status },
      newValues: { status: 'PAUSED' },
    });

    await this.syncSchedule(workspaceId, projectId, automationId, record.currentVersionId, false);

    return record;
  }

  /**
   * Syncs schedule repeatable jobs when automation status changes.
   */
  private async syncSchedule(
    workspaceId: string,
    projectId: string,
    automationId: string,
    currentVersionId: string | null,
    active: boolean
  ): Promise<void> {
    try {
      if (!active || !currentVersionId) {
        await automationScheduleService.unregisterSchedule(automationId);
        return;
      }

      const { rows: nodeRows } = await sql`
        SELECT type, configuration FROM automation_nodes
        WHERE automation_version_id = ${currentVersionId}
          AND UPPER(type) = 'SCHEDULED_TRIGGER';
      `;

      if (nodeRows && nodeRows.length > 0) {
        const config =
          typeof nodeRows[0].configuration === 'string'
            ? JSON.parse(nodeRows[0].configuration)
            : nodeRows[0].configuration || {};
        await automationScheduleService.registerSchedule({
          workspaceId,
          projectId,
          automationId,
          automationVersionId: currentVersionId,
          cron: config.cron || '0 9 * * 1-5',
          timezone: config.timezone || 'UTC',
        });
      } else {
        await automationScheduleService.unregisterSchedule(automationId);
      }
    } catch (err) {
      console.warn('[AutomationService] Schedule sync error:', err);
    }
  }

  // ==========================================================================
  // 2. VERSION OPERATIONS
  // ==========================================================================

  /**
   * List all versions of an automation.
   */
  async getVersions(
    workspaceId: string,
    projectId: string,
    automationId: string
  ): Promise<AutomationVersionRecord[]> {
    return automationDomainService.listVersions(workspaceId, projectId, automationId);
  }

  /**
   * Retrieve a specific version along with its nodes and edges.
   */
  async getVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string
  ): Promise<VersionGraphDetails> {
    const version = await automationDomainService.getVersion(
      workspaceId,
      projectId,
      automationId,
      versionId
    );
    const nodes = await automationDomainService.getNodes(
      workspaceId,
      projectId,
      automationId,
      versionId
    );
    const edges = await automationDomainService.getEdges(
      workspaceId,
      projectId,
      automationId,
      versionId
    );

    return {
      ...version,
      nodes,
      edges,
    };
  }

  /**
   * Create a new draft version.
   * Records audit log: automation.version.created.
   */
  async createDraftVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    input?: { cloneFromVersionId?: string },
    userId?: string | null
  ): Promise<AutomationVersionRecord> {
    const version = await automationDomainService.createDraftVersion(
      workspaceId,
      projectId,
      automationId,
      {
        createdBy: userId,
        cloneFromVersionId: input?.cloneFromVersionId,
      }
    );

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'automation.version.created',
      entityType: 'automation_version',
      entityId: version.id,
      newValues: {
        automationId,
        versionNumber: version.versionNumber,
        status: version.status,
      },
    });

    return version;
  }

  /**
   * Update a draft version's graph (nodes, edges, configuration).
   * Rejects editing if the version is PUBLISHED or ARCHIVED.
   * Records audit log: automation.updated.
   */
  async updateDraftVersion(
    workspaceId: string,
    projectId: string,
    automationId: string,
    versionId: string,
    input: {
      nodes?: Array<{
        nodeKey: string;
        type: string;
        label: string;
        positionX?: number;
        positionY?: number;
        configuration?: Record<string, any>;
      }>;
      edges?: Array<{
        sourceNodeId: string;
        targetNodeId: string;
        sourceHandle?: string | null;
        targetHandle?: string | null;
        conditionKey?: string | null;
      }>;
      metadata?: Record<string, any>;
    },
    userId?: string | null
  ): Promise<VersionGraphDetails> {
    // 1. Assert version is mutable (DRAFT)
    await automationDomainService.assertVersionMutable(
      workspaceId,
      projectId,
      automationId,
      versionId
    );

    try {
      await (sql as any).query('BEGIN');

      // If nodes are supplied, replace existing nodes & edges safely
      if (input.nodes !== undefined) {
        // Clear existing edges & nodes for this draft version
        await sql`
          DELETE FROM automation_edges
          WHERE automation_version_id = ${versionId};
        `;
        await sql`
          DELETE FROM automation_nodes
          WHERE automation_version_id = ${versionId};
        `;

        const nodeKeyToId = new Map<string, string>();

        for (const n of input.nodes) {
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
              ${n.nodeKey},
              ${n.type},
              ${n.label},
              ${n.positionX ?? 0},
              ${n.positionY ?? 0},
              ${JSON.stringify(n.configuration || {})}::jsonb
            )
            RETURNING id;
          `;
          nodeKeyToId.set(n.nodeKey, rows[0].id);
        }

        // Insert edges if provided
        if (input.edges && input.edges.length > 0) {
          for (const e of input.edges) {
            // Resolve source and target IDs: either raw node UUID or matching nodeKey
            const sourceId = nodeKeyToId.get(e.sourceNodeId) || e.sourceNodeId;
            const targetId = nodeKeyToId.get(e.targetNodeId) || e.targetNodeId;

            // Verify both nodes exist in this version
            const { rows: sCheck } = await sql`
              SELECT id FROM automation_nodes WHERE id = ${sourceId} AND automation_version_id = ${versionId};
            `;
            const { rows: tCheck } = await sql`
              SELECT id FROM automation_nodes WHERE id = ${targetId} AND automation_version_id = ${versionId};
            `;

            if (!sCheck || sCheck.length === 0 || !tCheck || tCheck.length === 0) {
              throw new AutomationEdgeInvalidNodeError(
                `Edge connection references invalid node: ${e.sourceNodeId} -> ${e.targetNodeId}`
              );
            }

            await sql`
              INSERT INTO automation_edges (
                automation_version_id,
                source_node_id,
                target_node_id,
                source_handle,
                target_handle,
                condition_key
              ) VALUES (
                ${versionId},
                ${sourceId},
                ${targetId},
                ${e.sourceHandle || null},
                ${e.targetHandle || null},
                ${e.conditionKey || null}
              );
            `;
          }
        }
      }

      // Touch automation updated_at
      await sql`
        UPDATE automations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ${automationId}
          AND workspace_id = ${workspaceId}
          AND project_id = ${projectId};
      `;

      await (sql as any).query('COMMIT');

      const updatedGraph = await this.getVersion(
        workspaceId,
        projectId,
        automationId,
        versionId
      );

      await recordAuditLog({
        workspaceId,
        projectId,
        userId,
        action: 'automation.updated',
        entityType: 'automation_version',
        entityId: versionId,
        newValues: {
          nodeCount: updatedGraph.nodes.length,
          edgeCount: updatedGraph.edges.length,
        },
      });

      return updatedGraph;
    } catch (err) {
      try {
        await (sql as any).query('ROLLBACK');
      } catch {
        // Ignored
      }
      throw err;
    }
  }
}

export const automationService = new AutomationService();
