export type SourceType = 'PDF' | 'DOCX' | 'TXT' | 'CSV' | 'URL' | 'FAQ' | 'TEXT';

export interface ProcessSourceInput {
  sourceId: string;
  type: SourceType;
  name: string;
  sourceUrl?: string | null;
  storageKey?: string | null;
  rawText?: string | null;
  metadata?: Record<string, any>;
  buffer?: Buffer;
}

export interface ExtractedDocument {
  title: string;
  content: string;
  language?: string;
  characterCount: number;
  tokenCount: number;
  metadata: Record<string, any>;
  status: 'READY' | 'NEEDS_OCR' | 'FAILED';
  errorMessage?: string;
}

export interface KnowledgeSourceProcessor {
  readonly supportedType: SourceType;
  process(input: ProcessSourceInput): Promise<ExtractedDocument>;
}
