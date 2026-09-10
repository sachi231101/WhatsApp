/**
 * Reusable text normalizer for knowledge documents.
 * Handles Unicode normalization, invisible/control characters, repeated whitespace,
 * while preserving paragraph structure and meaningful formatting.
 */
export class TextNormalizer {
  static normalize(raw: string): string {
    if (!raw) return '';

    // 1. Unicode NFC normalization
    let text = raw.normalize('NFC');

    // 2. Standardize line endings to \n
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 3. Strip invisible control characters except standard whitespace (\t, \n)
    // Characters like zero-width spaces (\u200B-\u200D, \uFEFF), null bytes, etc.
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');

    // 4. Clean line-by-line whitespace
    const lines = text.split('\n').map((line) => {
      // Replace multiple horizontal spaces/tabs with single space
      return line.replace(/[\t ]+/g, ' ').trim();
    });

    // 5. Join lines and collapse excessive blank lines (more than 2 consecutive newlines)
    text = lines.join('\n');
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }

  /**
   * Estimates token count for English/multilingual text (approx 4 chars per token).
   */
  static estimateTokenCount(text: string): number {
    if (!text) return 0;
    // Standard approximation: ~4 characters per token
    const words = text.trim().split(/\s+/).filter(Boolean);
    const charEstimate = Math.ceil(text.length / 4);
    // Weighted blend of word count * 1.3 and char count / 4
    return Math.max(1, Math.round(words.length * 1.3 * 0.5 + charEstimate * 0.5));
  }
}
