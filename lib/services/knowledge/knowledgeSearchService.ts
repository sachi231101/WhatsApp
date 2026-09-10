import { sql } from '@/lib/db';
import { EmbeddingProviderFactory } from '../../ai/embeddings/embeddingFactory';

export interface SearchKnowledgeParams {
  workspaceId: string;
  projectId: string;
  agentId?: string;
  knowledgeBaseId?: string;
  query: string;
  topK?: number;
  minScore?: number;
}

export interface SearchResultItem {
  chunkId: string;
  content: string;
  score: number;
  sourceId: string;
  documentId: string;
  sourceName: string;
  documentTitle: string;
  metadata: Record<string, any>;
}

export class KnowledgeSearchService {
  /**
   * Performs semantic vector search strictly scoped to workspace, project, and attached knowledge bases.
   */
  static async searchKnowledge(params: SearchKnowledgeParams): Promise<SearchResultItem[]> {
    const { workspaceId, projectId, agentId, knowledgeBaseId, query } = params;
    const topK = Math.min(Math.max(params.topK || 4, 1), 20);
    const minScore = params.minScore ?? 0.25;

    const trimmedQuery = query ? query.trim() : '';
    if (!trimmedQuery) {
      return [];
    }

    const startTime = Date.now();
    console.log(`[KnowledgeSearchService] search.started ws=${workspaceId} proj=${projectId} agent=${agentId || 'none'}`);

    try {
      // 1. Resolve authorized knowledge base IDs
      let targetKbIds: string[] = [];

      if (agentId) {
        // Find KBs attached to this specific agent
        const { rows: kbRows } = await sql`
          SELECT kb.id
          FROM knowledge_bases kb
          JOIN ai_agent_knowledge_bases aakb ON kb.id = aakb.knowledge_base_id
          WHERE aakb.agent_id = ${agentId}
            AND kb.workspace_id = ${workspaceId}
            AND kb.project_id = ${projectId}
            AND kb.status = 'ACTIVE'
        `;

        targetKbIds = kbRows.map((r: any) => r.id);

        if (targetKbIds.length === 0) {
          // No attached knowledge bases for this agent
          return [];
        }
      } else if (knowledgeBaseId) {
        // Verify KB ownership
        const { rows: kbRows } = await sql`
          SELECT id
          FROM knowledge_bases
          WHERE id = ${knowledgeBaseId}
            AND workspace_id = ${workspaceId}
            AND project_id = ${projectId}
            AND status = 'ACTIVE'
          LIMIT 1
        `;

        if (kbRows.length === 0) {
          return [];
        }
        targetKbIds = [knowledgeBaseId];
      } else {
        // In Step 8, searches MUST specify agentId or knowledgeBaseId for tenant isolation
        return [];
      }

      // 2. Generate embedding for search query
      const embeddingProvider = EmbeddingProviderFactory.getProvider();
      const queryVector = await embeddingProvider.embedQuery(trimmedQuery);
      const vectorLiteral = `[${queryVector.join(',')}]`;

      // 3. Execute vector similarity search using PostgreSQL <=> (cosine distance)
      const { rows: chunkRows } = await sql`
        SELECT
          kc.id AS chunk_id,
          kc.content,
          kc.token_count,
          kc.metadata,
          kd.id AS document_id,
          kd.title AS document_title,
          ks.id AS source_id,
          ks.name AS source_name,
          (1 - (kc.embedding <=> ${vectorLiteral}::vector)) AS similarity_score
        FROM knowledge_chunks kc
        JOIN knowledge_documents kd ON kc.knowledge_document_id = kd.id
        JOIN knowledge_sources ks ON kd.knowledge_source_id = ks.id
        WHERE kc.workspace_id = ${workspaceId}
          AND kc.project_id = ${projectId}
          AND ks.knowledge_base_id = ANY(${targetKbIds as any})
          AND ks.status = 'READY'
          AND kc.embedding IS NOT NULL
        ORDER BY kc.embedding <=> ${vectorLiteral}::vector ASC
        LIMIT ${topK}
      `;

      // 4. Filter and map results
      const results: SearchResultItem[] = chunkRows
        .map((r: any) => ({
          chunkId: r.chunk_id,
          content: r.content,
          score: Math.round((Number(r.similarity_score) || 0) * 1000) / 1000,
          sourceId: r.source_id,
          documentId: r.document_id,
          sourceName: r.source_name || 'Document',
          documentTitle: r.document_title || 'Section',
          metadata: r.metadata || {},
        }))
        .filter((item) => item.score >= minScore);

      console.log(
        `[KnowledgeSearchService] search.completed ws=${workspaceId} proj=${projectId} hits=${results.length} durationMs=${
          Date.now() - startTime
        }`
      );

      return results;
    } catch (err: any) {
      console.error('[KnowledgeSearchService] search.failed:', err.message);
      // Graceful degradation: return empty list on search failure instead of crashing conversational flow
      return [];
    }
  }
}
