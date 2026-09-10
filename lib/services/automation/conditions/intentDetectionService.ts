import { AIProviderFactory } from '@/lib/ai/providers/aiProviderFactory';

export interface IntentDetectionResult {
  intent: string;
  confidence: number;
  raw?: any;
}

export class IntentDetectionService {
  /**
   * Detects the intent of a text message using the established AI Provider abstraction.
   */
  static async detectIntent(
    messageText: string,
    options?: {
      targetIntent?: string;
      candidateIntents?: string[];
      providerName?: string;
    }
  ): Promise<IntentDetectionResult> {
    const text = (messageText || '').trim();
    if (!text) {
      return { intent: 'unknown', confidence: 0 };
    }

    try {
      const provider = AIProviderFactory.getProvider(options?.providerName || 'openai');

      const targetIntentPrompt = options?.targetIntent
        ? `Evaluate specifically whether the message represents the intent: "${options.targetIntent}".`
        : options?.candidateIntents && options.candidateIntents.length > 0
        ? `Select the closest matching intent from these candidates: [${options.candidateIntents.join(', ')}] or "other".`
        : 'Determine the primary customer intent as a concise snake_case identifier (e.g. pricing_question, support_request, greeting, complaint).';

      const systemPrompt = `You are a WhatsApp Business intent classification model.
${targetIntentPrompt}
Return a JSON object with:
- "intent": the classified intent in lowercase snake_case
- "confidence": a float between 0.0 and 1.0 representing your classification confidence
`;

      const response = await provider.generateStructuredOutput<{ intent: string; confidence: number }>({
        systemPrompt,
        messages: [{ role: 'user', content: text }],
        temperature: 0.1,
        maxTokens: 150,
        responseFormat: 'json',
      });

      if (response && response.data && typeof response.data.intent === 'string') {
        const confidence = typeof response.data.confidence === 'number'
          ? Math.max(0, Math.min(1, response.data.confidence))
          : 0.8;

        return {
          intent: response.data.intent.toLowerCase().trim(),
          confidence,
          raw: response.raw,
        };
      }

      return { intent: 'unknown', confidence: 0 };
    } catch (err: any) {
      throw new Error(`AI Intent classification failed: ${err.message || String(err)}`);
    }
  }
}
