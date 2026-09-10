import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export class TxtProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'TXT';

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    let raw = input.rawText || '';
    if (!raw && input.buffer) {
      raw = input.buffer.toString('utf-8');
    }

    const normalized = TextNormalizer.normalize(raw);
    const tokenCount = TextNormalizer.estimateTokenCount(normalized);

    return {
      title: input.name || 'Text Document',
      content: normalized,
      language: 'en',
      characterCount: normalized.length,
      tokenCount,
      metadata: { ...input.metadata, sourceName: input.name, type: 'TXT' },
      status: 'READY',
    };
  }
}
