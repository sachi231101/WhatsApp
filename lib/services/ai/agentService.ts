import { sql } from '@/lib/db';
import { ensureCoreTables } from '@/lib/auth/context';
import { recordAuditLog } from '@/lib/services/audit/auditLogger';
import { publishAiEvent } from '@/lib/realtime/ablyPublisher';

export class AgentNotFoundError extends Error {
  statusCode = 404;
  code = 'AGENT_NOT_FOUND';
  constructor(message = 'AI Agent not found.') {
    super(message);
    this.name = 'AgentNotFoundError';
  }
}

export interface AgentRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  handlingMode: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
  currentVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentVersion?: AgentVersionRecord | null;
  draftVersion?: AgentVersionRecord | null;
}

export interface AgentVersionRecord {
  id: string;
  agentId: string;
  workspaceId: string;
  projectId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  role: string;
  systemInstructions: string;
  tone: string;
  language: string;
  greetingMessage: string | null;
  fallbackMessage: string | null;
  responseBehavior: Record<string, any>;
  escalationEnabled: boolean;
  escalationMessage: string | null;
  escalationConditions: any[];
  maxResponseLength: number;
  temperature: number;
  model: string;
  provider: string;
  configuration: Record<string, any>;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface CreateAgentInput {
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string;
  role: string;
  systemInstructions: string;
  tone?: string;
  language?: string;
  greetingMessage?: string;
  fallbackMessage?: string;
  responseBehavior?: Record<string, any>;
  escalationEnabled?: boolean;
  escalationMessage?: string;
  escalationConditions?: any[];
  maxResponseLength?: number;
  temperature?: number;
  model?: string;
  provider?: string;
  handlingMode?: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
  userId?: string | null;
}

export interface UpdateDraftInput {
  workspaceId: string;
  projectId: string;
  agentId: string;
  name?: string;
  description?: string;
  role?: string;
  systemInstructions?: string;
  tone?: string;
  language?: string;
  greetingMessage?: string;
  fallbackMessage?: string;
  responseBehavior?: Record<string, any>;
  escalationEnabled?: boolean;
  escalationMessage?: string;
  escalationConditions?: any[];
  maxResponseLength?: number;
  temperature?: number;
  model?: string;
  provider?: string;
  handlingMode?: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
  userId?: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '-')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'agent';
}

export class AgentService {
  /**
   * List agents for a specific project.
   */
  async getAgents(options: {
    workspaceId: string;
    projectId: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      status = 'all',
      search,
      limit = 25,
      offset = 0,
    } = options;

    const pageSize = Math.min(Math.max(1, limit), 100);
    const searchParam = search && search.trim() ? `%${search.trim().toLowerCase()}%` : null;

    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int as total
      FROM ai_agents a
      WHERE a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId}
        AND a.status != 'ARCHIVED'
        AND (
          (${status} = 'all') OR
          (${status} = 'active' AND a.status = 'ACTIVE') OR
          (${status} = 'paused' AND a.status = 'PAUSED') OR
          (${status} = 'draft' AND a.status = 'DRAFT')
        )
        AND (
          ${searchParam}::text IS NULL OR
          LOWER(a.name) LIKE ${searchParam} OR
          LOWER(COALESCE(a.description, '')) LIKE ${searchParam}
        )
    `;
    const totalCount = countRows[0]?.total || 0;

    const { rows } = await sql`
      SELECT 
        a.id, a.workspace_id, a.project_id, a.name, a.slug, a.description,
        a.status, a.handling_mode, a.current_version_id, a.created_by,
        a.created_at, a.updated_at, a.archived_at,
        cv.version_number as current_version_number,
        cv.model as current_model,
        cv.provider as current_provider
      FROM ai_agents a
      LEFT JOIN ai_agent_versions cv ON a.current_version_id = cv.id
      WHERE a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId}
        AND a.status != 'ARCHIVED'
        AND (
          (${status} = 'all') OR
          (${status} = 'active' AND a.status = 'ACTIVE') OR
          (${status} = 'paused' AND a.status = 'PAUSED') OR
          (${status} = 'draft' AND a.status = 'DRAFT')
        )
        AND (
          ${searchParam}::text IS NULL OR
          LOWER(a.name) LIKE ${searchParam} OR
          LOWER(COALESCE(a.description, '')) LIKE ${searchParam}
        )
      ORDER BY a.updated_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    return {
      agents: rows.map((r: any) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        projectId: r.project_id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        status: r.status,
        handlingMode: r.handling_mode,
        currentVersionId: r.current_version_id,
        currentVersionNumber: r.current_version_number,
        currentModel: r.current_model || 'gpt-4o-mini',
        currentProvider: r.current_provider || 'openai',
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        archivedAt: r.archived_at,
      })),
      totalCount,
    };
  }

  /**
   * Retrieves single agent details including active published version and draft version if present.
   */
  async getAgentById(
    workspaceIdOrOptions: string | { workspaceId: string; projectId: string; agentId: string },
    projectId?: string,
    agentId?: string,
  ): Promise<AgentRecord> {
    await ensureCoreTables();

    const wsId = typeof workspaceIdOrOptions === 'object' ? workspaceIdOrOptions.workspaceId : workspaceIdOrOptions;
    const projId = typeof workspaceIdOrOptions === 'object' ? workspaceIdOrOptions.projectId : projectId!;
    const agId = typeof workspaceIdOrOptions === 'object' ? workspaceIdOrOptions.agentId : agentId!;

    const { rows: agentRows } = await sql`
      SELECT * FROM ai_agents
      WHERE id = ${agId}
        AND workspace_id = ${wsId}
        AND project_id = ${projId}
      LIMIT 1
    `;

    if (agentRows.length === 0) {
      throw new AgentNotFoundError();
    }
    const agent = agentRows[0];

    // Fetch current published version
    let currentVersion: AgentVersionRecord | null = null;
    if (agent.current_version_id) {
      const { rows: curRows } = await sql`
        SELECT * FROM ai_agent_versions WHERE id = ${agent.current_version_id} LIMIT 1
      `;
      if (curRows.length > 0) {
        currentVersion = this.mapVersionRow(curRows[0]);
      }
    }

    // Fetch latest draft version
    let draftVersion: AgentVersionRecord | null = null;
    const { rows: draftRows } = await sql`
      SELECT * FROM ai_agent_versions
      WHERE agent_id = ${agentId} AND status = 'DRAFT'
      ORDER BY version_number DESC
      LIMIT 1
    `;
    if (draftRows.length > 0) {
      draftVersion = this.mapVersionRow(draftRows[0]);
    }

    return {
      id: agent.id,
      workspaceId: agent.workspace_id,
      projectId: agent.project_id,
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      status: agent.status,
      handlingMode: agent.handling_mode,
      currentVersionId: agent.current_version_id,
      createdBy: agent.created_by,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      archivedAt: agent.archived_at,
      currentVersion,
      draftVersion,
    };
  }

  /**
   * Creates a new AI Agent with initial Draft version.
   */
  async createAgent(input: CreateAgentInput): Promise<AgentRecord> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      name,
      description,
      role,
      systemInstructions,
      tone = 'Professional',
      language = 'English',
      greetingMessage,
      fallbackMessage = "I apologize, I didn't quite catch that. Could you please rephrase?",
      responseBehavior = {},
      escalationEnabled = true,
      escalationMessage = 'I am connecting you with a team member who can help you further.',
      escalationConditions = [],
      maxResponseLength = 300,
      temperature = 0.3,
      model = 'gpt-4o-mini',
      provider = 'openai',
      handlingMode = 'AI_HANDLING',
      userId,
    } = input;

    if (!name || !name.trim()) {
      throw new Error('Agent name is required.');
    }
    if (!role || !role.trim()) {
      throw new Error('Agent role is required.');
    }
    if (!systemInstructions || !systemInstructions.trim()) {
      throw new Error('System instructions are required.');
    }

    // Generate unique slug for this project
    const baseSlug = slugify(name);
    let finalSlug = baseSlug;
    const { rows: slugCheck } = await sql`
      SELECT id FROM ai_agents WHERE project_id = ${projectId} AND slug = ${finalSlug} LIMIT 1
    `;
    if (slugCheck.length > 0) {
      finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    // Insert Agent
    const { rows: agentRows } = await sql`
      INSERT INTO ai_agents (
        workspace_id, project_id, name, slug, description, status, handling_mode, created_by
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${name.trim()}, ${finalSlug}, ${description?.trim() || null},
        ${'DRAFT'}, ${handlingMode}, ${userId || null}
      )
      RETURNING *
    `;
    const newAgent = agentRows[0];

    // Insert Initial Version (DRAFT, Version 1)
    const { rows: verRows } = await sql`
      INSERT INTO ai_agent_versions (
        agent_id, workspace_id, project_id, version_number, status, role,
        system_instructions, tone, language, greeting_message, fallback_message,
        response_behavior, escalation_enabled, escalation_message, escalation_conditions,
        max_response_length, temperature, model, provider, created_by
      )
      VALUES (
        ${newAgent.id}, ${workspaceId}, ${projectId}, ${1}, ${'DRAFT'}, ${role.trim()},
        ${systemInstructions.trim()}, ${tone}, ${language}, ${greetingMessage?.trim() || null},
        ${fallbackMessage?.trim() || null}, ${JSON.stringify(responseBehavior)},
        ${escalationEnabled}, ${escalationMessage?.trim() || null},
        ${JSON.stringify(escalationConditions)}, ${maxResponseLength}, ${temperature},
        ${model}, ${provider}, ${userId || null}
      )
      RETURNING *
    `;

    const initialDraftVersion = this.mapVersionRow(verRows[0]);

    // Record audit event
    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'agent.created',
      entityType: 'ai_agent',
      entityId: newAgent.id,
      newValues: { name: newAgent.name, slug: newAgent.slug, role },
    });

    return {
      id: newAgent.id,
      workspaceId: newAgent.workspace_id,
      projectId: newAgent.project_id,
      name: newAgent.name,
      slug: newAgent.slug,
      description: newAgent.description,
      status: newAgent.status,
      handlingMode: newAgent.handling_mode,
      currentVersionId: null,
      createdBy: newAgent.created_by,
      createdAt: newAgent.created_at,
      updatedAt: newAgent.updated_at,
      archivedAt: null,
      currentVersion: null,
      draftVersion: initialDraftVersion,
    };
  }

  /**
   * Updates an agent's active draft configuration.
   */
  async updateDraft(input: UpdateDraftInput): Promise<AgentRecord> {
    await ensureCoreTables();
    const {
      workspaceId,
      projectId,
      agentId,
      name,
      description,
      role,
      systemInstructions,
      tone,
      language,
      greetingMessage,
      fallbackMessage,
      responseBehavior,
      escalationEnabled,
      escalationMessage,
      escalationConditions,
      maxResponseLength,
      temperature,
      model,
      provider,
      handlingMode,
      userId,
    } = input;

    // Verify agent exists
    const current = await this.getAgentById(workspaceId, projectId, agentId);

    // 1. Update agent top-level attributes if provided
    if (name || description !== undefined || handlingMode) {
      await sql`
        UPDATE ai_agents
        SET
          name = COALESCE(${name?.trim() || null}, name),
          description = COALESCE(${description !== undefined ? description?.trim() : null}, description),
          handling_mode = COALESCE(${handlingMode || null}, handling_mode),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${agentId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      `;
    }

    // 2. Find or create draft version
    let draft = current.draftVersion;
    if (!draft) {
      // Find latest version number
      const { rows: maxVerRows } = await sql`
        SELECT COALESCE(MAX(version_number), 0) as max_v
        FROM ai_agent_versions
        WHERE agent_id = ${agentId}
      `;
      const nextVersionNumber = Number(maxVerRows[0]?.max_v ?? (maxVerRows[0] as any)?.max_ver ?? 0) + 1;

      // Seed draft from current published version if exists
      const sourceVer = current.currentVersion;
      const { rows: newDraftRows } = await sql`
        INSERT INTO ai_agent_versions (
          agent_id, workspace_id, project_id, version_number, status, role,
          system_instructions, tone, language, greeting_message, fallback_message,
          response_behavior, escalation_enabled, escalation_message, escalation_conditions,
          max_response_length, temperature, model, provider, created_by
        )
        VALUES (
          ${agentId}, ${workspaceId}, ${projectId}, ${nextVersionNumber}, 'DRAFT',
          ${sourceVer?.role || 'Assistant'},
          ${sourceVer?.systemInstructions || 'Help customers efficiently.'},
          ${sourceVer?.tone || 'Professional'},
          ${sourceVer?.language || 'English'},
          ${sourceVer?.greetingMessage || null},
          ${sourceVer?.fallbackMessage || null},
          ${JSON.stringify(sourceVer?.responseBehavior || {})},
          ${sourceVer?.escalationEnabled ?? true},
          ${sourceVer?.escalationMessage || null},
          ${JSON.stringify(sourceVer?.escalationConditions || [])},
          ${sourceVer?.maxResponseLength || 300},
          ${sourceVer?.temperature || 0.3},
          ${sourceVer?.model || 'gpt-4o-mini'},
          ${sourceVer?.provider || 'openai'},
          ${userId || null}
        )
        RETURNING *
      `;
      draft = this.mapVersionRow(newDraftRows[0]);
    }

    // 3. Update draft version fields
    await sql`
      UPDATE ai_agent_versions
      SET
        role = COALESCE(${role?.trim() || null}, role),
        system_instructions = COALESCE(${systemInstructions?.trim() || null}, system_instructions),
        tone = COALESCE(${tone || null}, tone),
        language = COALESCE(${language || null}, language),
        greeting_message = CASE WHEN ${greetingMessage !== undefined} THEN ${greetingMessage?.trim() || null} ELSE greeting_message END,
        fallback_message = CASE WHEN ${fallbackMessage !== undefined} THEN ${fallbackMessage?.trim() || null} ELSE fallback_message END,
        response_behavior = CASE WHEN ${responseBehavior !== undefined} THEN ${JSON.stringify(responseBehavior)}::jsonb ELSE response_behavior END,
        escalation_enabled = COALESCE(${escalationEnabled}, escalation_enabled),
        escalation_message = CASE WHEN ${escalationMessage !== undefined} THEN ${escalationMessage?.trim() || null} ELSE escalation_message END,
        escalation_conditions = CASE WHEN ${escalationConditions !== undefined} THEN ${JSON.stringify(escalationConditions)}::jsonb ELSE escalation_conditions END,
        max_response_length = COALESCE(${maxResponseLength}, max_response_length),
        temperature = COALESCE(${temperature}, temperature),
        model = COALESCE(${model || null}, model),
        provider = COALESCE(${provider || null}, provider)
      WHERE id = ${draft.id}
    `;

    // Record audit event
    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'agent.updated',
      entityType: 'ai_agent',
      entityId: agentId,
      newValues: { name: name || current.name },
    });

    return await this.getAgentById(workspaceId, projectId, agentId);
  }

  /**
   * Publishes the active draft into an immutable published version.
   */
  async publishVersion(options: {
    workspaceId: string;
    projectId: string;
    agentId: string;
    userId?: string | null;
  }): Promise<AgentRecord> {
    await ensureCoreTables();
    const { workspaceId, projectId, agentId, userId } = options;

    const current = await this.getAgentById(workspaceId, projectId, agentId);
    if (!current.draftVersion) {
      throw new Error('No draft version exists to publish.');
    }

    const draft = current.draftVersion;

    // Validate required fields for production
    if (!draft.role || !draft.role.trim()) {
      throw new Error('Agent role is required to publish.');
    }
    if (!draft.systemInstructions || !draft.systemInstructions.trim()) {
      throw new Error('System instructions are required to publish.');
    }
    if (!draft.model) {
      throw new Error('AI Model is required to publish.');
    }

    // 1. Mark previous published version as ARCHIVED
    if (current.currentVersionId) {
      await sql`
        UPDATE ai_agent_versions
        SET status = 'ARCHIVED'
        WHERE id = ${current.currentVersionId}
      `;
    }

    // 2. Mark draft version as PUBLISHED and set published_at
    await sql`
      UPDATE ai_agent_versions
      SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
      WHERE id = ${draft.id}
    `;

    // 3. Update agent current_version_id and status to ACTIVE
    await sql`
      UPDATE ai_agents
      SET
        current_version_id = ${draft.id},
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${agentId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
    `;

    // 4. Record audit event
    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'agent.published',
      entityType: 'ai_agent',
      entityId: agentId,
      newValues: { versionId: draft.id, versionNumber: draft.versionNumber },
    });

    // 5. Emit realtime event
    await publishAiEvent({
      workspaceId,
      projectId,
      event: 'agent.published',
      data: { agentId, versionNumber: draft.versionNumber },
    });

    return await this.getAgentById(workspaceId, projectId, agentId);
  }

  /**
   * Activates an agent.
   */
  async activateAgent(
    workspaceIdOrOpts: string | { workspaceId: string; projectId: string; agentId: string; userId?: string | null },
    projectId?: string,
    agentId?: string,
    userId?: string | null,
  ) {
    const wsId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.workspaceId : workspaceIdOrOpts;
    const projId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.projectId : projectId!;
    const agId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.agentId : agentId!;
    const uId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.userId : userId;

    await ensureCoreTables();
    const current = await this.getAgentById(wsId, projId, agId);

    if (!current.currentVersionId) {
      throw new Error('Agent cannot be activated without a published version. Please publish the agent first.');
    }

    await sql`
      UPDATE ai_agents
      SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${agId} AND workspace_id = ${wsId} AND project_id = ${projId}
    `;

    await recordAuditLog({
      workspaceId: wsId,
      projectId: projId,
      userId: uId,
      action: 'agent.activated',
      entityType: 'ai_agent',
      entityId: agId,
    });

    await publishAiEvent({
      workspaceId: wsId,
      projectId: projId,
      event: 'agent.updated',
      data: { agentId: agId, status: 'ACTIVE' },
    });

    return await this.getAgentById(wsId, projId, agId);
  }

  /**
   * Pauses an agent.
   */
  async pauseAgent(
    workspaceIdOrOpts: string | { workspaceId: string; projectId: string; agentId: string; userId?: string | null },
    projectId?: string,
    agentId?: string,
    userId?: string | null,
  ) {
    const wsId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.workspaceId : workspaceIdOrOpts;
    const projId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.projectId : projectId!;
    const agId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.agentId : agentId!;
    const uId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.userId : userId;

    await ensureCoreTables();
    await this.getAgentById(wsId, projId, agId);

    await sql`
      UPDATE ai_agents
      SET status = 'PAUSED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${agId} AND workspace_id = ${wsId} AND project_id = ${projId}
    `;

    await recordAuditLog({
      workspaceId: wsId,
      projectId: projId,
      userId: uId,
      action: 'agent.paused',
      entityType: 'ai_agent',
      entityId: agId,
    });

    await publishAiEvent({
      workspaceId: wsId,
      projectId: projId,
      event: 'agent.paused',
      data: { agentId: agId },
    });

    return await this.getAgentById(wsId, projId, agId);
  }

  /**
   * Rolls back to a previous published version by creating a new version reference.
   * Preserves immutability of the target version.
   */
  async rollbackVersion(options: {
    workspaceId: string;
    projectId: string;
    agentId: string;
    targetVersionNumber: number;
    userId?: string | null;
  }): Promise<AgentRecord> {
    await ensureCoreTables();
    const { workspaceId, projectId, agentId, targetVersionNumber, userId } = options;

    const current = await this.getAgentById(workspaceId, projectId, agentId);

    // Fetch target version
    const { rows: targetRows } = await sql`
      SELECT * FROM ai_agent_versions
      WHERE agent_id = ${agentId} AND version_number = ${targetVersionNumber}
      LIMIT 1
    `;

    if (targetRows.length === 0) {
      throw new Error(`Version ${targetVersionNumber} not found.`);
    }
    const targetVer = this.mapVersionRow(targetRows[0]);

    // Fetch highest version number
    const { rows: maxRows } = await sql`
      SELECT COALESCE(MAX(version_number), 0) as max_v
      FROM ai_agent_versions
      WHERE agent_id = ${agentId}
    `;
    const nextVerNum = Number(maxRows[0]?.max_v ?? (maxRows[0] as any)?.max_ver ?? 0) + 1;

    // Archive current published version
    if (current.currentVersionId) {
      await sql`
        UPDATE ai_agent_versions
        SET status = 'ARCHIVED'
        WHERE id = ${current.currentVersionId}
      `;
    }

    // Create new published version copying configuration from target
    const { rows: newVerRows } = await sql`
      INSERT INTO ai_agent_versions (
        agent_id, workspace_id, project_id, version_number, status, role,
        system_instructions, tone, language, greeting_message, fallback_message,
        response_behavior, escalation_enabled, escalation_message, escalation_conditions,
        max_response_length, temperature, model, provider, configuration, created_by, published_at
      )
      VALUES (
        ${agentId}, ${workspaceId}, ${projectId}, ${nextVerNum}, 'PUBLISHED',
        ${targetVer.role}, ${targetVer.systemInstructions}, ${targetVer.tone}, ${targetVer.language},
        ${targetVer.greetingMessage}, ${targetVer.fallbackMessage},
        ${JSON.stringify(targetVer.responseBehavior)}, ${targetVer.escalationEnabled},
        ${targetVer.escalationMessage}, ${JSON.stringify(targetVer.escalationConditions)},
        ${targetVer.maxResponseLength}, ${targetVer.temperature}, ${targetVer.model},
        ${targetVer.provider}, ${JSON.stringify(targetVer.configuration)},
        ${userId || null}, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const rolledBackVersion = newVerRows[0];

    // Update agent current version and status
    await sql`
      UPDATE ai_agents
      SET
        current_version_id = ${rolledBackVersion.id},
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${agentId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
    `;

    // Record audit event
    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'agent.rollback',
      entityType: 'ai_agent',
      entityId: agentId,
      newValues: {
        targetVersionNumber,
        newVersionNumber: nextVerNum,
      },
    });

    await publishAiEvent({
      workspaceId,
      projectId,
      event: 'agent.rollback',
      data: {
        agentId,
        targetVersionNumber,
        newVersionNumber: nextVerNum,
      },
    });

    return await this.getAgentById(workspaceId, projectId, agentId);
  }

  /**
   * Duplicates an existing agent into a new draft agent.
   */
  async duplicateAgent(options: {
    workspaceId: string;
    projectId: string;
    agentId: string;
    newName?: string;
    userId?: string | null;
  }): Promise<AgentRecord> {
    await ensureCoreTables();
    const { workspaceId, projectId, agentId, newName, userId } = options;

    const source = await this.getAgentById(workspaceId, projectId, agentId);
    const sourceVer = source.currentVersion || source.draftVersion;

    const nameToUse = newName?.trim() || `${source.name} (Copy)`;
    return await this.createAgent({
      workspaceId,
      projectId,
      name: nameToUse,
      description: source.description || undefined,
      role: sourceVer?.role || 'Assistant',
      systemInstructions: sourceVer?.systemInstructions || 'Help customers.',
      tone: sourceVer?.tone,
      language: sourceVer?.language,
      greetingMessage: sourceVer?.greetingMessage || undefined,
      fallbackMessage: sourceVer?.fallbackMessage || undefined,
      responseBehavior: sourceVer?.responseBehavior,
      escalationEnabled: sourceVer?.escalationEnabled,
      escalationMessage: sourceVer?.escalationMessage || undefined,
      escalationConditions: sourceVer?.escalationConditions,
      maxResponseLength: sourceVer?.maxResponseLength,
      temperature: sourceVer?.temperature,
      model: sourceVer?.model,
      provider: sourceVer?.provider,
      handlingMode: source.handlingMode,
      userId,
    });
  }

  /**
   * Archives an agent.
   */
  async archiveAgent(
    workspaceIdOrOpts: string | { workspaceId: string; projectId: string; agentId: string; userId?: string | null },
    projectId?: string,
    agentId?: string,
    userId?: string | null,
  ): Promise<void> {
    const wsId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.workspaceId : workspaceIdOrOpts;
    const projId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.projectId : projectId!;
    const agId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.agentId : agentId!;
    const uId = typeof workspaceIdOrOpts === 'object' ? workspaceIdOrOpts.userId : userId;

    await ensureCoreTables();
    await this.getAgentById(wsId, projId, agId);

    await sql`
      UPDATE ai_agents
      SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${agId} AND workspace_id = ${wsId} AND project_id = ${projId}
    `;

    await recordAuditLog({
      workspaceId: wsId,
      projectId: projId,
      userId: uId,
      action: 'agent.archived',
      entityType: 'ai_agent',
      entityId: agId,
    });

    await publishAiEvent({
      workspaceId: wsId,
      projectId: projId,
      event: 'agent.archived',
      data: { agentId: agId },
    });
  }

  /**
   * Lists all version history for an agent.
   */
  async getVersions(workspaceId: string, projectId: string, agentId: string): Promise<AgentVersionRecord[]> {
    await ensureCoreTables();
    await this.getAgentById(workspaceId, projectId, agentId);

    const { rows } = await sql`
      SELECT * FROM ai_agent_versions
      WHERE agent_id = ${agentId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      ORDER BY version_number DESC
    `;

    return rows.map((r) => this.mapVersionRow(r));
  }

  /**
   * Aggregates usage metrics for an agent.
   */
  async getAgentUsageSummary(workspaceId: string, projectId: string, agentId: string) {
    await ensureCoreTables();

    const { rows } = await sql`
      SELECT 
        COUNT(*)::int as total_requests,
        COALESCE(SUM(input_tokens), 0)::int as total_input_tokens,
        COALESCE(SUM(output_tokens), 0)::int as total_output_tokens,
        COALESCE(SUM(total_tokens), 0)::int as total_tokens,
        COALESCE(AVG(latency_ms), 0)::int as avg_latency_ms,
        COUNT(*) FILTER (WHERE status = 'SUCCESS')::int as success_count,
        COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed_count,
        COUNT(*) FILTER (WHERE status = 'ESCALATED')::int as escalated_count
      FROM ai_usage
      WHERE workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND agent_id = ${agentId}
    `;

    return rows[0] || {
      total_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      avg_latency_ms: 0,
      success_count: 0,
      failed_count: 0,
      escalated_count: 0,
    };
  }

  private mapVersionRow(r: any): AgentVersionRecord {
    const rawConfig = typeof r.configuration === 'object' && r.configuration !== null ? { ...r.configuration } : {};
    delete (rawConfig as any).apiKey;
    delete (rawConfig as any).api_key;
    delete (rawConfig as any).secret;
    delete (rawConfig as any).token;
    delete (rawConfig as any).password;

    const result: any = {
      id: r.id,
      agentId: r.agent_id,
      agent_id: r.agent_id,
      workspaceId: r.workspace_id,
      workspace_id: r.workspace_id,
      projectId: r.project_id,
      project_id: r.project_id,
      versionNumber: r.version_number,
      version_number: r.version_number,
      status: r.status,
      role: r.role,
      systemInstructions: r.system_instructions,
      system_instructions: r.system_instructions,
      tone: r.tone,
      language: r.language,
      greetingMessage: r.greeting_message,
      greeting_message: r.greeting_message,
      fallbackMessage: r.fallback_message,
      fallback_message: r.fallback_message,
      responseBehavior: typeof r.response_behavior === 'object' ? r.response_behavior : {},
      response_behavior: typeof r.response_behavior === 'object' ? r.response_behavior : {},
      escalationEnabled: Boolean(r.escalation_enabled),
      escalation_enabled: Boolean(r.escalation_enabled),
      escalationMessage: r.escalation_message,
      escalation_message: r.escalation_message,
      escalationConditions: Array.isArray(r.escalation_conditions) ? r.escalation_conditions : [],
      escalation_conditions: Array.isArray(r.escalation_conditions) ? r.escalation_conditions : [],
      maxResponseLength: Number(r.max_response_length) || 300,
      max_response_length: Number(r.max_response_length) || 300,
      temperature: Number(r.temperature) || 0.3,
      model: r.model || 'gpt-4o-mini',
      provider: r.provider || 'openai',
      configuration: rawConfig,
      createdBy: r.created_by,
      created_by: r.created_by,
      createdAt: r.created_at,
      created_at: r.created_at,
      publishedAt: r.published_at,
      published_at: r.published_at,
    };

    return result as AgentVersionRecord;
  }
}

export const agentService = new AgentService();
