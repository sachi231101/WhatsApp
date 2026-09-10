import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export class CsvProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'CSV';

  /**
   * RFC 4180 compliant CSV line/record parser.
   */
  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          if (char === '\r') i++; // Skip \r in \r\n
          currentRow.push(currentCell.trim());
          if (currentRow.some((c) => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    const raw = input.rawText || (input.buffer ? input.buffer.toString('utf-8') : '');
    const rows = this.parseCsv(raw);

    if (rows.length === 0) {
      return {
        title: input.name || 'CSV Data',
        content: '',
        characterCount: 0,
        tokenCount: 0,
        metadata: { ...input.metadata, sourceName: input.name, type: 'CSV', rowCount: 0 },
        status: 'READY',
      };
    }

    const headers = rows[0].map((h) => h || 'Column');
    const dataRows = rows.slice(1);

    // Transform each data row into structured record
    const records: string[] = [];
    dataRows.forEach((row, rowIndex) => {
      const fields: string[] = [];
      headers.forEach((header, colIndex) => {
        const val = row[colIndex] || '';
        if (val) {
          fields.push(`${header}: ${val}`);
        }
      });

      if (fields.length > 0) {
        records.push(`[Record ${rowIndex + 1}]\n${fields.join('\n')}`);
      }
    });

    const structuredContent = records.join('\n\n---\n\n');
    const normalized = TextNormalizer.normalize(structuredContent);
    const tokenCount = TextNormalizer.estimateTokenCount(normalized);

    return {
      title: input.name || 'CSV Data',
      content: normalized,
      language: 'en',
      characterCount: normalized.length,
      tokenCount,
      metadata: {
        ...input.metadata,
        sourceName: input.name,
        type: 'CSV',
        rowCount: dataRows.length,
        columnCount: headers.length,
        headers,
      },
      status: 'READY',
    };
  }
}
