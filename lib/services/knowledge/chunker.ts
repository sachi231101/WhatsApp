import { TextNormalizer } from './normalizer';

export interface ChunkOptions {
  maxTokens?: number; // Target chunk size (default: 600 tokens)
  overlapTokens?: number; // Overlap size (default: 80 tokens)
}

export interface KnowledgeChunkItem {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: Record<string, any>;
}

export class KnowledgeChunker {
  /**
   * Deterministically splits text into token-aware chunks preserving semantic boundaries
   * (paragraphs -> lines -> sentences -> words).
   */
  static chunkText(
    text: string,
    options: ChunkOptions = {},
    baseMetadata: Record<string, any> = {}
  ): KnowledgeChunkItem[] {
    const normalized = TextNormalizer.normalize(text);
    if (!normalized) return [];

    const maxTokens = options.maxTokens || 600;
    const overlapTokens = options.overlapTokens || 80;

    // Convert token limits to approximate character limits (~4 chars per token)
    const maxChars = maxTokens * 4;
    const overlapChars = overlapTokens * 4;

    const totalTokens = TextNormalizer.estimateTokenCount(normalized);
    if (totalTokens <= maxTokens) {
      return [
        {
          chunkIndex: 0,
          content: normalized,
          tokenCount: totalTokens,
          metadata: { ...baseMetadata, totalChunks: 1 },
        },
      ];
    }

    // Split hierarchy: 1. Paragraphs
    const paragraphs = normalized.split(/\n\n+/);
    const semanticBlocks: string[] = [];

    for (const para of paragraphs) {
      if (para.length <= maxChars) {
        semanticBlocks.push(para);
      } else {
        // Break large paragraph into sentences
        const sentences = para.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [para];
        let currentSentenceBlock = '';

        for (const sentence of sentences) {
          if ((currentSentenceBlock + sentence).length <= maxChars) {
            currentSentenceBlock += sentence;
          } else {
            if (currentSentenceBlock.trim()) {
              semanticBlocks.push(currentSentenceBlock.trim());
            }
            if (sentence.length <= maxChars) {
              currentSentenceBlock = sentence;
            } else {
              // Word level fallback for massive sentence without punctuation
              const words = sentence.split(/\s+/);
              let wordBlock = '';
              for (const w of words) {
                if ((wordBlock + ' ' + w).length <= maxChars) {
                  wordBlock = wordBlock ? wordBlock + ' ' + w : w;
                } else {
                  if (wordBlock) semanticBlocks.push(wordBlock);
                  wordBlock = w;
                }
              }
              if (wordBlock) currentSentenceBlock = wordBlock;
            }
          }
        }
        if (currentSentenceBlock.trim()) {
          semanticBlocks.push(currentSentenceBlock.trim());
        }
      }
    }

    // Now pack semantic blocks into overlapping chunks
    const chunks: KnowledgeChunkItem[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (let i = 0; i < semanticBlocks.length; i++) {
      const block = semanticBlocks[i];

      if (!currentChunk) {
        currentChunk = block;
      } else if ((currentChunk + '\n\n' + block).length <= maxChars) {
        currentChunk += '\n\n' + block;
      } else {
        // Emit current chunk
        const chunkTokens = TextNormalizer.estimateTokenCount(currentChunk);
        chunks.push({
          chunkIndex,
          content: currentChunk,
          tokenCount: chunkTokens,
          metadata: { ...baseMetadata, chunkNumber: chunkIndex + 1 },
        });
        chunkIndex++;

        // Calculate overlap from previous chunk's trailing text
        let overlap = '';
        if (overlapChars > 0 && currentChunk.length > overlapChars) {
          const tail = currentChunk.slice(currentChunk.length - overlapChars);
          // Try to break at a clean sentence or word boundary within the overlap tail
          const spaceIdx = tail.indexOf(' ');
          overlap = spaceIdx !== -1 ? tail.slice(spaceIdx + 1).trim() : tail.trim();
        }

        currentChunk = overlap ? `${overlap}\n\n${block}` : block;
      }
    }

    if (currentChunk.trim()) {
      const chunkTokens = TextNormalizer.estimateTokenCount(currentChunk);
      chunks.push({
        chunkIndex,
        content: currentChunk,
        tokenCount: chunkTokens,
        metadata: { ...baseMetadata, chunkNumber: chunkIndex + 1 },
      });
    }

    // Stamp totalChunks on all chunks
    const total = chunks.length;
    chunks.forEach((c) => {
      c.metadata.totalChunks = total;
    });

    return chunks;
  }
}
