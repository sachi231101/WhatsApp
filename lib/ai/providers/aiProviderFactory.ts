import { AIProvider } from './types';
import { OpenAIProvider } from './openAiProvider';

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();

  static getProvider(providerName = 'openai', apiKey?: string): AIProvider {
    const key = providerName.toLowerCase().trim();

    if (key === 'openai') {
      if (apiKey) {
        return new OpenAIProvider(apiKey);
      }
      if (!this.providers.has('openai')) {
        this.providers.set('openai', new OpenAIProvider());
      }
      return this.providers.get('openai')!;
    }

    // Extensible placeholders for future Gemini and Anthropic implementations
    if (key === 'gemini' || key === 'google_gemini') {
      throw new Error('Google Gemini provider will be enabled in a future update. Please select OpenAI.');
    }

    if (key === 'anthropic') {
      throw new Error('Anthropic provider will be enabled in a future update. Please select OpenAI.');
    }

    throw new Error(`Unsupported AI provider: ${providerName}. Supported providers: openai`);
  }

  static getSupportedProviders(): Array<{ id: string; name: string; models: string[] }> {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
      },
    ];
  }
}
