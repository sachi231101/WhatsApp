import { SourceType, KnowledgeSourceProcessor } from './types';
import { PdfProcessor } from './pdfProcessor';
import { DocxProcessor } from './docxProcessor';
import { TxtProcessor } from './txtProcessor';
import { CsvProcessor } from './csvProcessor';
import { UrlProcessor } from './urlProcessor';
import { FaqProcessor } from './faqProcessor';
import { TextProcessor } from './textProcessor';

export * from './types';
export * from './pdfProcessor';
export * from './docxProcessor';
export * from './txtProcessor';
export * from './csvProcessor';
export * from './urlProcessor';
export * from './faqProcessor';
export * from './textProcessor';

const processors: Record<SourceType, KnowledgeSourceProcessor> = {
  PDF: new PdfProcessor(),
  DOCX: new DocxProcessor(),
  TXT: new TxtProcessor(),
  CSV: new CsvProcessor(),
  URL: new UrlProcessor(),
  FAQ: new FaqProcessor(),
  TEXT: new TextProcessor(),
};

export function getProcessor(type: string): KnowledgeSourceProcessor {
  const normalizedType = String(type).toUpperCase() as SourceType;
  const processor = processors[normalizedType];
  if (!processor) {
    throw new Error(`Unsupported knowledge source type: "${type}"`);
  }
  return processor;
}
