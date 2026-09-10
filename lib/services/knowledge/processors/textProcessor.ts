import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export class TextProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'TEXT';

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    const raw = input.rawText || (input.buffer ? input.buffer.toString('utf-8') : '');
    const normalized = TextNormalizer.normalize(raw);
    const tokenCount = TextNormalizer.estimateTokenCount(normalized);

    return {
      title: input.name || 'Plain Text',
      content: normalized,
      language: 'en',
      characterCount: normalized.length,
      tokenCount,
      metadata: { ...input.metadata, sourceName: input.name, type: 'TEXT' },
      status: 'READY',
    };
  }
}
