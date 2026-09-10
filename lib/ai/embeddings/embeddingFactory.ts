import { EmbeddingProvider, EmbeddingOptions } from './types';
import { OpenAIEmbeddingProvider } from './openAiEmbeddingProvider';
import { MockEmbeddingProvider } from './mockEmbeddingProvider';

export class EmbeddingProviderFactory {
  static getProvider(options: EmbeddingOptions = {}): EmbeddingProvider {
    if (process.env.NODE_ENV === 'test' && !process.env.OPENAI_API_KEY) {
      return new MockEmbeddingProvider();
    }
    return new OpenAIEmbeddingProvider(options);
  }
}
