import { sql } from '@/lib/db';
import { recordAuditLog } from '@/lib/services/audit/auditLogger';
import { getStorageProvider } from './storage/storageProvider';
import { enqueueKnowledgeSourceProcess } from '@/lib/queue/knowledgeQueue';
import { processKnowledgeSourceJob } from '@/lib/queue/knowledgeWorker';

export interface CreateKbInput {
  name: string;
  description?: string;
}

export interface UpdateKbInput {
  name?: string;
  description?: string;
  status?: string;
}

export interface AddSourceInput {
  type: string;
  name: string;
  sourceUrl?: string;
  rawText?: string;
  metadata?: Record<string, any>;
  fileBuffer?: Buffer;
  mimeType?: string;
  filename?: string;
}

export class KnowledgeService {
  /**
   * Lists all active knowledge bases for a workspace and project with aggregated stats.
   */
  static async listKnowledgeBases(workspaceId: string, projectId: string) {
    const { rows } = await sql`
      SELECT
        kb.id,
        kb.name,
        kb.description,
        kb.status,
        kb.embedding_model,
        kb.created_at,
        kb.updated_at,
        COUNT(DISTINCT ks.id)::int AS source_count,
        COUNT(DISTINCT CASE WHEN ks.status = 'READY' THEN ks.id END)::int AS ready_count,
        COUNT(DISTINCT CASE WHEN ks.status = 'PROCESSING' OR ks.status = 'PENDING' THEN ks.id END)::int AS processing_count,
        COUNT(DISTINCT aakb.agent_id)::int AS connected_agent_count
      FROM knowledge_bases kb
      LEFT JOIN knowledge_sources ks ON kb.id = ks.knowledge_base_id AND ks.status != 'ARCHIVED'
      LEFT JOIN ai_agent_knowledge_bases aakb ON kb.id = aakb.knowledge_base_id
      WHERE kb.workspace_id = ${workspaceId}
        AND kb.project_id = ${projectId}
        AND kb.status != 'ARCHIVED'
      GROUP BY kb.id
      ORDER BY kb.created_at DESC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      status: r.status,
      embeddingModel: r.embedding_model,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      sourceCount: Number(r.source_count) || 0,
      readyCount: Number(r.ready_count) || 0,
      processingCount: Number(r.processing_count) || 0,
      connectedAgentCount: Number(r.connected_agent_count) || 0,
    }));
  }

  /**
   * Retrieves single knowledge base with details and connected agents.
   */
  static async getKnowledgeBase(workspaceId: string, projectId: string, kbId: string) {
    const { rows } = await sql`
      SELECT
        kb.id,
        kb.name,
        kb.description,
        kb.status,
        kb.embedding_model,
        kb.created_at,
        kb.updated_at,
        COUNT(DISTINCT ks.id)::int AS source_count,
        COUNT(DISTINCT CASE WHEN ks.status = 'READY' THEN ks.id END)::int AS ready_count,
        COUNT(DISTINCT CASE WHEN ks.status = 'PROCESSING' OR ks.status = 'PENDING' THEN ks.id END)::int AS processing_count,
        COUNT(DISTINCT CASE WHEN ks.status = 'FAILED' THEN ks.id END)::int AS failed_count
      FROM knowledge_bases kb
      LEFT JOIN knowledge_sources ks ON kb.id = ks.knowledge_base_id AND ks.status != 'ARCHIVED'
      WHERE kb.id = ${kbId}
        AND kb.workspace_id = ${workspaceId}
        AND kb.project_id = ${projectId}
      GROUP BY kb.id
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    const kb = rows[0];

    // Fetch connected agents
    const { rows: agentRows } = await sql`
      SELECT a.id, a.name, a.slug, a.status, a.role_description
      FROM ai_agents a
      JOIN ai_agent_knowledge_bases aakb ON a.id = aakb.agent_id
      WHERE aakb.knowledge_base_id = ${kbId}
        AND a.workspace_id = ${workspaceId}
        AND a.project_id = ${projectId}
      ORDER BY a.name ASC
    `;

    return {
      id: kb.id,
      name: kb.name,
      description: kb.description || '',
      status: kb.status,
      embeddingModel: kb.embedding_model,
      createdAt: kb.created_at,
      updatedAt: kb.updated_at,
      sourceCount: Number(kb.source_count) || 0,
      readyCount: Number(kb.ready_count) || 0,
      processingCount: Number(kb.processing_count) || 0,
      failedCount: Number(kb.failed_count) || 0,
      connectedAgents: agentRows.map((a: any) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        status: a.status,
        role: a.role_description,
      })),
    };
  }

  /**
   * Creates a new knowledge base.
   */
  static async createKnowledgeBase(
    workspaceId: string,
    projectId: string,
    userId: string,
    data: CreateKbInput
  ) {
    const name = (data.name || '').trim();
    if (!name) {
      throw new Error('Knowledge Base name is required');
    }
    if (name.length > 255) {
      throw new Error('Knowledge Base name cannot exceed 255 characters');
    }

    const description = (data.description || '').trim();

    const { rows } = await sql`
      INSERT INTO knowledge_bases (
        workspace_id, project_id, name, description, status, created_by
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${name}, ${description}, 'ACTIVE', ${userId}
      )
      RETURNING id, name, description, status, created_at, updated_at
    `;

    const kb = rows[0];

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_base.created',
      entityType: 'knowledge_base',
      entityId: kb.id,
      newValues: { name: kb.name },
    }).catch((): null => null);

    return kb;
  }

  /**
   * Updates an existing knowledge base (name, description).
   */
  static async updateKnowledgeBase(
    workspaceId: string,
    projectId: string,
    kbId: string,
    userId: string,
    data: { name?: string; description?: string }
  ) {
    const existing = await this.getKnowledgeBase(workspaceId, projectId, kbId);
    if (!existing) {
      throw new Error('Knowledge Base not found or unauthorized');
    }

    const { rows } = await sql`
      UPDATE knowledge_bases
      SET 
        name = COALESCE(${data.name || null}, name),
        description = COALESCE(${data.description !== undefined ? data.description : null}, description),
        updated_at = NOW()
      WHERE id = ${kbId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      RETURNING id, name, description, status, created_at, updated_at
    `;

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_base.updated',
      entityType: 'knowledge_base',
      entityId: kbId,
      newValues: { updatedFields: Object.keys(data) },
    }).catch((): null => null);

    return rows[0];
  }

  /**
   * Archives a knowledge base.
   */
  static async archiveKnowledgeBase(
    workspaceId: string,
    projectId: string,
    kbId: string,
    userId: string
  ) {
    const existing = await this.getKnowledgeBase(workspaceId, projectId, kbId);
    if (!existing) {
      throw new Error('Knowledge Base not found or unauthorized');
    }

    await sql`
      UPDATE knowledge_bases
      SET status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW()
      WHERE id = ${kbId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
    `;

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_base.archived',
      entityType: 'knowledge_base',
      entityId: kbId,
      oldValues: { name: existing.name },
    }).catch((): null => null);

    return { success: true };
  }

  /**
   * Adds a knowledge source (File, URL, FAQ, Plain Text) and queues it for asynchronous processing.
   */
  static async addSource(
    workspaceId: string,
    projectId: string,
    kbId: string,
    userId: string,
    input: AddSourceInput
  ) {
    const kb = await this.getKnowledgeBase(workspaceId, projectId, kbId);
    if (!kb) {
      throw new Error('Knowledge Base not found or unauthorized');
    }

    const type = String(input.type || '').toUpperCase();
    const validTypes = ['PDF', 'DOCX', 'TXT', 'CSV', 'URL', 'FAQ', 'TEXT'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid source type "${type}". Allowed: ${validTypes.join(', ')}`);
    }

    const name = (input.name || input.filename || 'Untitled Source').trim();
    let storageKey: string | null = null;
    let checksum: string | null = null;

    // Handle file upload if buffer provided
    if (input.fileBuffer) {
      const storage = getStorageProvider();
      const filename = input.filename || `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const fileKey = `${workspaceId}/${projectId}/${kbId}/${filename}`;
      const uploadRes = await storage.saveFile(fileKey, input.fileBuffer, input.mimeType);
      storageKey = uploadRes.key;
      checksum = uploadRes.checksum;
    }

    const metadata = {
      ...(input.metadata || {}),
      rawText: input.rawText,
    };

    const { rows } = await sql`
      INSERT INTO knowledge_sources (
        workspace_id, project_id, knowledge_base_id, type, name,
        source_url, mime_type, storage_key, checksum, status, metadata
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${kbId}, ${type}, ${name},
        ${input.sourceUrl || null}, ${input.mimeType || null}, ${storageKey}, ${checksum},
        'PENDING', ${JSON.stringify(metadata)}
      )
      RETURNING id, type, name, status, created_at
    `;

    const source = rows[0];

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_source.created',
      entityType: 'knowledge_source',
      entityId: source.id,
      newValues: { type, name, kbId },
    }).catch((): null => null);

    // Enqueue BullMQ processing job
    await enqueueKnowledgeSourceProcess({
      workspaceId,
      projectId,
      knowledgeBaseId: kbId,
      sourceId: source.id,
    });

    // In test environment, execute worker inline for synchronous test assertions
    if (process.env.NODE_ENV === 'test') {
      try {
        await processKnowledgeSourceJob({
          workspaceId,
          projectId,
          knowledgeBaseId: kbId,
          sourceId: source.id,
        });
      } catch (err: any) {
        console.warn('[KnowledgeService] Test inline processing error:', err.message);
      }
    }

    return source;
  }

  /**
   * Lists all sources belonging to a knowledge base.
   */
  static async listSources(workspaceId: string, projectId: string, kbId: string) {
    const { rows } = await sql`
      SELECT
        ks.id,
        ks.type,
        ks.name,
        ks.source_url,
        ks.mime_type,
        ks.status,
        ks.error_message,
        ks.created_at,
        ks.updated_at,
        ks.processed_at,
        kd.id AS document_id,
        kd.character_count,
        kd.token_count,
        COUNT(kc.id)::int AS chunk_count
      FROM knowledge_sources ks
      LEFT JOIN knowledge_documents kd ON ks.id = kd.knowledge_source_id
      LEFT JOIN knowledge_chunks kc ON kd.id = kc.knowledge_document_id
      WHERE ks.knowledge_base_id = ${kbId}
        AND ks.workspace_id = ${workspaceId}
        AND ks.project_id = ${projectId}
        AND ks.status != 'ARCHIVED'
      GROUP BY ks.id, kd.id
      ORDER BY ks.created_at DESC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      sourceUrl: r.source_url,
      mimeType: r.mime_type,
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      processedAt: r.processed_at,
      documentId: r.document_id,
      characterCount: Number(r.character_count) || 0,
      tokenCount: Number(r.token_count) || 0,
      chunkCount: Number(r.chunk_count) || 0,
    }));
  }

  /**
   * Gets details and chunks for a single source.
   */
  static async getSource(workspaceId: string, projectId: string, kbId: string, sourceId: string) {
    const { rows: sourceRows } = await sql`
      SELECT
        ks.id, ks.type, ks.name, ks.source_url, ks.mime_type, ks.status,
        ks.error_message, ks.created_at, ks.processed_at, ks.metadata,
        kd.id AS document_id, kd.title AS document_title, kd.content,
        kd.character_count, kd.token_count
      FROM knowledge_sources ks
      LEFT JOIN knowledge_documents kd ON ks.id = kd.knowledge_source_id
      WHERE ks.id = ${sourceId}
        AND ks.knowledge_base_id = ${kbId}
        AND ks.workspace_id = ${workspaceId}
        AND ks.project_id = ${projectId}
      LIMIT 1
    `;

    if (sourceRows.length === 0) {
      return null;
    }

    const s = sourceRows[0];

    // Fetch chunk previews
    const { rows: chunkRows } = await sql`
      SELECT id, chunk_index, content, token_count, metadata, created_at
      FROM knowledge_chunks
      WHERE knowledge_document_id = ${s.document_id}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      ORDER BY chunk_index ASC
      LIMIT 50
    `;

    return {
      id: s.id,
      type: s.type,
      name: s.name,
      sourceUrl: s.source_url,
      mimeType: s.mime_type,
      status: s.status,
      errorMessage: s.error_message,
      createdAt: s.created_at,
      processedAt: s.processed_at,
      metadata: s.metadata,
      document: s.document_id
        ? {
            id: s.document_id,
            title: s.document_title,
            contentPreview: (s.content || '').slice(0, 500),
            characterCount: s.character_count,
            tokenCount: s.token_count,
            chunks: chunkRows.map((c: any) => ({
              id: c.id,
              chunkIndex: c.chunk_index,
              content: c.content,
              tokenCount: c.token_count,
              metadata: c.metadata,
            })),
          }
        : null,
    };
  }

  /**
   * Reprocesses an existing source.
   */
  static async reprocessSource(
    workspaceId: string,
    projectId: string,
    kbId: string,
    sourceId: string,
    userId: string
  ) {
    const existing = await this.getSource(workspaceId, projectId, kbId, sourceId);
    if (!existing) {
      throw new Error('Knowledge source not found or unauthorized');
    }

    await sql`
      UPDATE knowledge_sources
      SET status = 'PENDING', error_message = NULL, updated_at = NOW()
      WHERE id = ${sourceId}
        AND knowledge_base_id = ${kbId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
    `;

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_source.reprocessed',
      entityType: 'knowledge_source',
      entityId: sourceId,
      newValues: { name: existing.name },
    }).catch((): null => null);

    await enqueueKnowledgeSourceProcess({
      workspaceId,
      projectId,
      knowledgeBaseId: kbId,
      sourceId,
      reprocess: true,
    });

    if (process.env.NODE_ENV === 'test') {
      await processKnowledgeSourceJob({
        workspaceId,
        projectId,
        knowledgeBaseId: kbId,
        sourceId,
        reprocess: true,
      });
    }

    return { success: true };
  }

  /**
   * Deletes a source and removes associated chunks and stored files.
   */
  static async deleteSource(
    workspaceId: string,
    projectId: string,
    kbId: string,
    sourceId: string,
    userId: string
  ) {
    const { rows } = await sql`
      SELECT id, name, storage_key
      FROM knowledge_sources
      WHERE id = ${sourceId}
        AND knowledge_base_id = ${kbId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error('Source not found or unauthorized');
    }

    const source = rows[0];

    // Delete file from storage if present
    if (source.storage_key) {
      const storage = getStorageProvider();
      await storage.deleteFile(source.storage_key).catch((): null => null);
    }

    // Delete chunks and documents
    const { rows: docs } = await sql`
      SELECT id FROM knowledge_documents WHERE knowledge_source_id = ${sourceId}
    `;
    for (const d of docs) {
      await sql`DELETE FROM knowledge_chunks WHERE knowledge_document_id = ${d.id}`;
    }
    await sql`DELETE FROM knowledge_documents WHERE knowledge_source_id = ${sourceId}`;
    await sql`DELETE FROM knowledge_sources WHERE id = ${sourceId}`;

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_source.deleted',
      entityType: 'knowledge_source',
      entityId: sourceId,
      oldValues: { name: source.name },
    }).catch((): null => null);

    return { success: true };
  }

  /**
   * Attaches a knowledge base to an AI agent.
   */
  static async attachAgent(
    workspaceId: string,
    projectId: string,
    agentId: string,
    kbId: string,
    userId: string
  ) {
    // Verify agent belongs to workspace/project
    const { rows: agentRows } = await sql`
      SELECT id, name FROM ai_agents
      WHERE id = ${agentId} AND workspace_id = ${workspaceId} AND project_id = ${projectId}
      LIMIT 1
    `;
    if (agentRows.length === 0) {
      throw new Error('AI Agent not found or unauthorized');
    }

    // Verify KB belongs to workspace/project
    const kb = await this.getKnowledgeBase(workspaceId, projectId, kbId);
    if (!kb) {
      throw new Error('Knowledge Base not found or unauthorized');
    }

    await sql`
      INSERT INTO ai_agent_knowledge_bases (agent_id, knowledge_base_id)
      VALUES (${agentId}, ${kbId})
      ON CONFLICT (agent_id, knowledge_base_id) DO NOTHING
    `;

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_base.agent_attached',
      entityType: 'ai_agent_knowledge_base',
      entityId: `${agentId}:${kbId}`,
      newValues: { agentId, kbId, agentName: agentRows[0].name, kbName: kb.name },
    }).catch((): null => null);

    return { success: true };
  }

  /**
   * Detaches a knowledge base from an AI agent.
   */
  static async detachAgent(
    workspaceId: string,
    projectId: string,
    agentId: string,
    kbId: string,
    userId: string
  ) {
    await sql`
      DELETE FROM ai_agent_knowledge_bases
      WHERE agent_id = ${agentId} AND knowledge_base_id = ${kbId}
    `;

    await recordAuditLog({
      workspaceId,
      projectId,
      userId,
      action: 'knowledge_base.agent_detached',
      entityType: 'ai_agent_knowledge_base',
      entityId: `${agentId}:${kbId}`,
      oldValues: { agentId, kbId },
    }).catch((): null => null);

    return { success: true };
  }

  /**
   * Lists all knowledge bases attached to an agent.
   */
  static async getAgentKnowledgeBases(workspaceId: string, projectId: string, agentId: string) {
    const { rows } = await sql`
      SELECT
        kb.id,
        kb.name,
        kb.description,
        kb.status,
        COUNT(DISTINCT ks.id)::int AS source_count,
        aakb.created_at AS attached_at
      FROM knowledge_bases kb
      JOIN ai_agent_knowledge_bases aakb ON kb.id = aakb.knowledge_base_id
      LEFT JOIN knowledge_sources ks ON kb.id = ks.knowledge_base_id AND ks.status = 'READY'
      WHERE aakb.agent_id = ${agentId}
        AND kb.workspace_id = ${workspaceId}
        AND kb.project_id = ${projectId}
        AND kb.status = 'ACTIVE'
      GROUP BY kb.id, aakb.created_at
      ORDER BY kb.name ASC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      status: r.status,
      sourceCount: Number(r.source_count) || 0,
      attachedAt: r.attached_at,
    }));
  }
}
