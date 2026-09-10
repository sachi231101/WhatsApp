import zlib from 'zlib';
import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export class DocxProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'DOCX';

  /**
   * Pure Node.js ZIP file reader extracting word/document.xml from DOCX buffer.
   */
  private extractDocumentXml(buffer: Buffer): string {
    // Check ZIP magic bytes: PK\x03\x04
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new Error('Invalid DOCX format: file is not a valid ZIP package');
    }

    let offset = 0;
    while (offset < buffer.length - 30) {
      // Look for local file header: 0x04034b50
      if (buffer.readUInt32LE(offset) !== 0x04034b50) {
        offset++;
        continue;
      }

      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const fileName = buffer.toString('utf-8', offset + 30, offset + 30 + fileNameLength);
      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

      if (fileName === 'word/document.xml') {
        const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);
        if (compressionMethod === 0) {
          // Stored (no compression)
          return compressedData.toString('utf-8');
        } else if (compressionMethod === 8) {
          // Deflated
          const decompressed = zlib.inflateRawSync(compressedData);
          return decompressed.toString('utf-8');
        } else {
          throw new Error(`Unsupported DOCX ZIP compression method: ${compressionMethod}`);
        }
      }

      offset = dataOffset + compressedSize;
    }

    throw new Error('Could not find word/document.xml inside DOCX file archive');
  }

  /**
   * Parses XML elements from word/document.xml preserving paragraphs and tables.
   */
  private parseWordXml(xml: string): string {
    // 1. Replace table cells and rows
    let parsed = xml.replace(/<\/w:tc>/gi, '\t');
    parsed = parsed.replace(/<\/w:tr>/gi, '\n');

    // 2. Replace paragraph breaks
    parsed = parsed.replace(/<\/w:p>/gi, '\n\n');
    parsed = parsed.replace(/<w:br\b[^>]*\/>/gi, '\n');
    parsed = parsed.replace(/<w:tab\b[^>]*\/>/gi, '\t');

    // 3. Strip all other XML tags and keep text
    parsed = parsed.replace(/<[^>]+>/g, '');

    // Decode standard XML entities
    parsed = parsed
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    return TextNormalizer.normalize(parsed);
  }

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error('DOCX processing requires a non-empty file buffer');
    }

    const xml = this.extractDocumentXml(input.buffer);
    const content = this.parseWordXml(xml);
    const tokenCount = TextNormalizer.estimateTokenCount(content);

    return {
      title: input.name || 'DOCX Document',
      content,
      language: 'en',
      characterCount: content.length,
      tokenCount,
      metadata: {
        ...input.metadata,
        sourceName: input.name,
        type: 'DOCX',
      },
      status: 'READY',
    };
  }
}
