import { Worker, Job } from 'bullmq';
import { sql } from '@/lib/db';
import { getRedisOptions } from './redis';
import { KNOWLEDGE_QUEUE_NAME, KnowledgeProcessJobData } from './knowledgeQueue';
import { getProcessor } from '../services/knowledge/processors';
import { KnowledgeChunker } from '../services/knowledge/chunker';
import { EmbeddingProviderFactory } from '../ai/embeddings/embeddingFactory';
import { getStorageProvider } from '../services/knowledge/storage/storageProvider';

export async function processKnowledgeSourceJob(data: KnowledgeProcessJobData): Promise<void> {
  const { workspaceId, projectId, knowledgeBaseId, sourceId } = data;
  const startTime = Date.now();

  console.log(`[KnowledgeWorker] processing_started sourceId=${sourceId} ws=${workspaceId} proj=${projectId}`);

  // 1. Mark status = PROCESSING
  await sql`
    UPDATE knowledge_sources
    SET status = 'PROCESSING', error_message = NULL, updated_at = NOW()
    WHERE id = ${sourceId}
      AND workspace_id = ${workspaceId}
      AND project_id = ${projectId}
      AND knowledge_base_id = ${knowledgeBaseId}
  `;

  try {
    // 2. Load Source details
    const { rows: sourceRows } = await sql`
      SELECT id, type, name, source_url, mime_type, storage_key, checksum, metadata
      FROM knowledge_sources
      WHERE id = ${sourceId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND knowledge_base_id = ${knowledgeBaseId}
      LIMIT 1
    `;

    if (sourceRows.length === 0) {
      throw new Error(`Knowledge source "${sourceId}" not found or unauthorized`);
    }

    const source = sourceRows[0];
    let fileBuffer: Buffer | undefined;

    if (source.storage_key) {
      const storage = getStorageProvider();
      fileBuffer = await storage.readFile(source.storage_key);
    }

    // 3. Process source
    const processor = getProcessor(source.type);
    const extracted = await processor.process({
      sourceId: source.id,
      type: source.type,
      name: source.name,
      sourceUrl: source.source_url,
      storageKey: source.storage_key,
      rawText: source.metadata?.rawText || source.metadata?.text,
      metadata: source.metadata,
      buffer: fileBuffer,
    });

    if (extracted.status === 'NEEDS_OCR') {
      await sql`
        UPDATE knowledge_sources
        SET status = 'FAILED',
            error_message = ${extracted.errorMessage || 'Scanned document requires OCR.'},
            updated_at = NOW()
        WHERE id = ${sourceId}
      `;
      return;
    }

    if (extracted.status === 'FAILED') {
      throw new Error(extracted.errorMessage || 'Document text extraction failed');
    }

    // 4. Chunk document
    const chunks = KnowledgeChunker.chunkText(
      extracted.content,
      { maxTokens: 600, overlapTokens: 80 },
      { sourceId, sourceName: source.name, documentTitle: extracted.title }
    );

    // 5. Generate embeddings
    const embeddingProvider = EmbeddingProviderFactory.getProvider();
    const textsToEmbed = chunks.map((c) => c.content);

    console.log(`[KnowledgeWorker] embedding.started sourceId=${sourceId} chunkCount=${chunks.length}`);
    const embeddings = await embeddingProvider.embedBatch(textsToEmbed);
    console.log(`[KnowledgeWorker] embedding.completed sourceId=${sourceId} durationMs=${Date.now() - startTime}`);

    // 6. Idempotent replacement: delete any existing chunks/documents for this source
    // Cascades or deletes explicitly
    const { rows: existingDocs } = await sql`
      SELECT id FROM knowledge_documents WHERE knowledge_source_id = ${sourceId}
    `;

    for (const doc of existingDocs) {
      await sql`DELETE FROM knowledge_chunks WHERE knowledge_document_id = ${doc.id}`;
    }
    await sql`DELETE FROM knowledge_documents WHERE knowledge_source_id = ${sourceId}`;

    // 7. Insert new Document record
    const { rows: newDocRows } = await sql`
      INSERT INTO knowledge_documents (
        workspace_id, project_id, knowledge_source_id, title, content,
        language, character_count, token_count, version, status
      )
      VALUES (
        ${workspaceId}, ${projectId}, ${sourceId}, ${extracted.title}, ${extracted.content},
        ${extracted.language || 'en'}, ${extracted.characterCount}, ${extracted.tokenCount}, 1, 'READY'
      )
      RETURNING id
    `;

    const documentId = newDocRows[0].id;

    // 8. Insert Chunks with pgvector embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const emb = embeddings[i] || [];
      const vectorLiteral = `[${emb.join(',')}]`;

      await sql`
        INSERT INTO knowledge_chunks (
          workspace_id, project_id, knowledge_document_id, chunk_index,
          content, token_count, embedding, metadata
        )
        VALUES (
          ${workspaceId}, ${projectId}, ${documentId}, ${chunk.chunkIndex},
          ${chunk.content}, ${chunk.tokenCount}, ${vectorLiteral}::vector, ${JSON.stringify(chunk.metadata)}
        )
      `;
    }

    // 9. Mark Source as READY
    await sql`
      UPDATE knowledge_sources
      SET status = 'READY',
          error_message = NULL,
          processed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${sourceId}
    `;

    console.log(
      `[KnowledgeWorker] processing_completed sourceId=${sourceId} chunks=${chunks.length} totalDurationMs=${Date.now() - startTime}`
    );
  } catch (err: any) {
    console.error(`[KnowledgeWorker] processing_failed sourceId=${sourceId}:`, err.message);

    // Store safe user-facing error message without internal stack traces
    const safeError = err.message ? String(err.message).replace(/at\s+.*/g, '').trim() : 'Processing failed';

    await sql`
      UPDATE knowledge_sources
      SET status = 'FAILED',
          error_message = ${safeError},
          updated_at = NOW()
      WHERE id = ${sourceId}
    `;

    throw err;
  }
}

let knowledgeWorkerInstance: Worker<KnowledgeProcessJobData> | null = null;

export function startKnowledgeWorker(): Worker<KnowledgeProcessJobData> {
  if (knowledgeWorkerInstance) {
    return knowledgeWorkerInstance;
  }

  const redisOptions = getRedisOptions();
  knowledgeWorkerInstance = new Worker<KnowledgeProcessJobData>(
    KNOWLEDGE_QUEUE_NAME,
    async (job: Job<KnowledgeProcessJobData>) => {
      await processKnowledgeSourceJob(job.data);
    },
    {
      connection: redisOptions,
      concurrency: 5,
    }
  );

  knowledgeWorkerInstance.on('completed', (job) => {
    console.log(`[KnowledgeWorker] Job ${job.id} completed successfully`);
  });

  knowledgeWorkerInstance.on('failed', (job, err) => {
    console.error(`[KnowledgeWorker] Job ${job?.id} failed:`, err.message);
  });

  return knowledgeWorkerInstance;
}
