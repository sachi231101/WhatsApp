import zlib from 'zlib';
import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export class PdfProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'PDF';

  /**
   * Pure Node.js robust PDF text stream parser (works without external binary dependencies).
   */
  private extractTextFromPdfBuffer(buffer: Buffer): { text: string; pageCount: number } {
    const textChunks: string[] = [];
    let pageCount = 0;

    // Detect page count by counting /Type /Page or /Type/Page
    const rawContent = buffer.toString('binary');
    const pageMatches = rawContent.match(/\/Type\s*\/Page\b/g);
    pageCount = pageMatches ? pageMatches.length : 1;

    // 1. First, search for decompressed or literal text blocks: BT ... ET
    const extractFromRawString = (str: string) => {
      const textRegex = /\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g;
      let match: RegExpExecArray | null;
      while ((match = textRegex.exec(str)) !== null) {
        if (match[1]) {
          // (text) Tj
          textChunks.push(this.decodePdfString(match[1]));
        } else if (match[2]) {
          // [(t) (ext)] TJ
          const arrayParts = match[2].match(/\(([^)]*)\)/g);
          if (arrayParts) {
            const joined = arrayParts
              .map((p) => this.decodePdfString(p.slice(1, -1)))
              .join('');
            textChunks.push(joined);
          }
        }
      }
    };

    extractFromRawString(rawContent);

    // 2. Extract FlateDecode compressed streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;

    while ((streamMatch = streamRegex.exec(rawContent)) !== null) {
      const streamStart = streamMatch.index + streamMatch[0].indexOf('\n') + 1;
      const streamEnd = streamMatch.index + streamMatch[0].lastIndexOf('\nendstream');

      if (streamStart < streamEnd) {
        const streamBuffer = buffer.subarray(streamStart, streamEnd);
        try {
          const decompressed = zlib.inflateSync(streamBuffer);
          const decompressedStr = decompressed.toString('latin1');
          extractFromRawString(decompressedStr);
        } catch {
          // Stream might not be zlib/deflate or might be encrypted/image; safely ignore
        }
      }
    }

    const joinedText = textChunks.join(' ');
    return {
      text: joinedText,
      pageCount: Math.max(1, pageCount),
    };
  }

  private decodePdfString(str: string): string {
    return str
      .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  }

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error('PDF processing requires a non-empty file buffer');
    }

    // Verify PDF header magic bytes (%PDF-)
    const header = input.buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw new Error('Invalid PDF file format: missing %PDF- header');
    }

    const { text, pageCount } = this.extractTextFromPdfBuffer(input.buffer);
    const normalized = TextNormalizer.normalize(text);

    // If PDF has pages but extracted text is minimal or empty, it is likely scanned images requiring OCR
    if (normalized.length < 15) {
      return {
        title: input.name || 'PDF Document',
        content: '',
        characterCount: 0,
        tokenCount: 0,
        metadata: {
          ...input.metadata,
          sourceName: input.name,
          type: 'PDF',
          pageCount,
          requiresOcr: true,
        },
        status: 'NEEDS_OCR',
        errorMessage: 'PDF contains scanned images and no extractable text layer. Optical Character Recognition (OCR) is required.',
      };
    }

    const tokenCount = TextNormalizer.estimateTokenCount(normalized);

    return {
      title: input.name || 'PDF Document',
      content: normalized,
      language: 'en',
      characterCount: normalized.length,
      tokenCount,
      metadata: {
        ...input.metadata,
        sourceName: input.name,
        type: 'PDF',
        pageCount,
      },
      status: 'READY',
    };
  }
}
