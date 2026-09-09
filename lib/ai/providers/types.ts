export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  systemPrompt?: string;
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AIUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionResult {
  content: string;
  usage: AIUsageStats;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface AIProviderHealth {
  ok: boolean;
  message?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  generateResponse(options: AICompletionOptions): Promise<AICompletionResult>;
  generateStructuredOutput<T>(options: AICompletionOptions, schemaName?: string): Promise<{ data: T; raw: AICompletionResult }>;
  countTokens(text: string): number;
  healthCheck(): Promise<AIProviderHealth>;
}
