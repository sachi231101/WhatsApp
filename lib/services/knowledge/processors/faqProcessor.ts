import { KnowledgeSourceProcessor, ProcessSourceInput, ExtractedDocument } from './types';
import { TextNormalizer } from '../normalizer';

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export class FaqProcessor implements KnowledgeSourceProcessor {
  readonly supportedType = 'FAQ';

  async process(input: ProcessSourceInput): Promise<ExtractedDocument> {
    const raw = input.rawText || (input.buffer ? input.buffer.toString('utf-8') : '');
    const faqs: FaqItem[] = [];

    // Check if metadata already has structured FAQs
    if (Array.isArray(input.metadata?.faqs)) {
      for (const item of input.metadata.faqs) {
        if (item.question && item.answer) {
          faqs.push({
            question: String(item.question).trim(),
            answer: String(item.answer).trim(),
            category: item.category ? String(item.category).trim() : undefined,
          });
        }
      }
    } else if (raw.trim().startsWith('[') || raw.trim().startsWith('{')) {
      // Try parsing as JSON
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed.faqs || [parsed];
        for (const item of list) {
          if (item.question && item.answer) {
            faqs.push({
              question: String(item.question).trim(),
              answer: String(item.answer).trim(),
              category: item.category ? String(item.category).trim() : undefined,
            });
          }
        }
      } catch {
        // Fallback to text parsing below
      }
    }

    // If still empty, parse text lines using Q: / A: patterns
    if (faqs.length === 0 && raw) {
      const lines = raw.split('\n');
      let currentQ = '';
      let currentA = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^(Q|Question):\s*/i.test(trimmed)) {
          if (currentQ && currentA) {
            faqs.push({ question: currentQ, answer: currentA });
            currentQ = '';
            currentA = '';
          }
          currentQ = trimmed.replace(/^(Q|Question):\s*/i, '').trim();
        } else if (/^(A|Answer):\s*/i.test(trimmed)) {
          currentA = trimmed.replace(/^(A|Answer):\s*/i, '').trim();
        } else if (currentA) {
          currentA += '\n' + trimmed;
        } else if (currentQ) {
          currentQ += ' ' + trimmed;
        }
      }

      if (currentQ && currentA) {
        faqs.push({ question: currentQ, answer: currentA });
      }
    }

    // Format into structured semantic knowledge representation
    let formattedText = '';
    if (faqs.length > 0) {
      formattedText = faqs
        .map((f, idx) => {
          const cat = f.category ? ` [Category: ${f.category}]` : '';
          return `Question ${idx + 1}${cat}:\n${f.question}\n\nAnswer:\n${f.answer}`;
        })
        .join('\n\n---\n\n');
    } else {
      formattedText = raw; // Fallback to raw text if no QA structure was identified
    }

    const normalized = TextNormalizer.normalize(formattedText);
    const tokenCount = TextNormalizer.estimateTokenCount(normalized);

    return {
      title: input.name || 'FAQ Knowledge',
      content: normalized,
      language: 'en',
      characterCount: normalized.length,
      tokenCount,
      metadata: {
        ...input.metadata,
        sourceName: input.name,
        type: 'FAQ',
        faqCount: faqs.length,
      },
      status: 'READY',
    };
  }
}
