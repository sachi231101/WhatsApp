import { AIProvider, AICompletionOptions, AICompletionResult, AIProviderHealth, AIMessage } from './types';

// In-memory test mock handler for Vitest
export type MockCompletionHandler = (
  options: AICompletionOptions,
) => Promise<Partial<AICompletionResult> & { content: string }> | (Partial<AICompletionResult> & { content: string });
let testMockHandler: MockCompletionHandler | null = null;

export function setTestMockHandler(handler: MockCompletionHandler | null): void {
  testMockHandler = handler;
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly defaultModel = 'gpt-4o-mini';

  static setTestMockHandler(handler: MockCompletionHandler | null): void {
    setTestMockHandler(handler);
  }

  private apiKey: string | null;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || null;
    this.baseUrl = baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (testMockHandler) {
      return { ok: true };
    }

    if (!this.isConfigured()) {
      return { ok: false, message: 'AI provider is not configured.' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        return { ok: true };
      }
      return { ok: false, message: `OpenAI returned status ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Network error checking OpenAI health.' };
    }
  }

  countTokens(text: string): number {
    if (!text) return 0;
    // Standard rule-of-thumb: ~4 characters per token in English
    return Math.max(1, Math.ceil(text.trim().length / 4));
  }

  async generateResponse(options: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    // 1. Check test mock handler first (for isolated test suites)
    if (testMockHandler) {
      const mockRes = await testMockHandler(options);
      return {
        content: mockRes.content || '',
        usage: mockRes.usage || { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        model: mockRes.model || options.model || this.defaultModel,
        provider: mockRes.provider || this.name,
        latencyMs: mockRes.latencyMs !== undefined ? mockRes.latencyMs : (Date.now() - startTime),
      };
    }

    // 2. Validate configuration
    if (!this.isConfigured()) {
      throw new Error('AI provider is not configured.');
    }

    const {
      systemPrompt,
      messages,
      model = this.defaultModel,
      temperature = 0.3,
      maxTokens = 500,
      responseFormat = 'text',
    } = options;

    const formattedMessages: AIMessage[] = [];
    if (systemPrompt && systemPrompt.trim()) {
      formattedMessages.push({ role: 'system', content: systemPrompt.trim() });
    }
    formattedMessages.push(...messages);

    const payload: Record<string, any> = {
      model,
      messages: formattedMessages,
      temperature: Math.min(Math.max(0, temperature), 1.0),
      max_tokens: Math.min(Math.max(50, maxTokens), 2000),
    };

    if (responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const timeoutSignal = AbortSignal.timeout(25000); // 25s timeout
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: timeoutSignal,
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const errMsg = errorJson?.error?.message || `OpenAI API returned HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content: content.trim(),
      usage: {
        promptTokens: data.usage?.prompt_tokens || this.countTokens(JSON.stringify(formattedMessages)),
        completionTokens: data.usage?.completion_tokens || this.countTokens(content),
        totalTokens: data.usage?.total_tokens || (this.countTokens(JSON.stringify(formattedMessages)) + this.countTokens(content)),
      },
      model: data.model || model,
      provider: this.name,
      latencyMs,
    };
  }

  async generateStructuredOutput<T>(options: AICompletionOptions, _schemaName?: string): Promise<{ data: T; raw: AICompletionResult }> {
    const raw = await this.generateResponse({
      ...options,
      responseFormat: 'json',
    });

    try {
      const parsed = JSON.parse(raw.content) as T;
      return { data: parsed, raw };
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${raw.content.slice(0, 100)}`);
    }
  }
}
