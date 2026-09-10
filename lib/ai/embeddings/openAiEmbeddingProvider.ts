import axios from 'axios';
import { EmbeddingProvider, EmbeddingOptions } from './types';
import { MockEmbeddingProvider } from './mockEmbeddingProvider';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = 'openai';
  readonly modelName: string;
  readonly dimensions: number;
  private apiKey: string;
  private batchSize: number;
  private fallbackMock: MockEmbeddingProvider | null = null;

  constructor(options: EmbeddingOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.modelName = options.model || 'text-embedding-3-small';
    this.dimensions = options.dimensions || 1536;
    this.batchSize = options.batchSize || 64;

    // Use mock fallback if no API key in test or dev environment
    if (!this.apiKey && (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY)) {
      this.fallbackMock = new MockEmbeddingProvider();
    }
  }

  private async requestWithRetry(input: string[], retries = 3, backoffMs = 1000): Promise<number[][]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/embeddings',
          {
            model: this.modelName,
            input,
            dimensions: this.dimensions,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout: 30000,
          }
        );

        if (response.data && Array.isArray(response.data.data)) {
          const sorted = [...response.data.data].sort((a: any, b: any) => a.index - b.index);
          return sorted.map((item: any) => item.embedding);
        }
        throw new Error('Unexpected OpenAI embeddings response format');
      } catch (err: any) {
        const status = err.response?.status;
        const isRetryable = status === 429 || (status >= 500 && status < 600) || err.code === 'ECONNABORTED';

        if (attempt < retries && isRetryable) {
          await new Promise((res) => setTimeout(res, backoffMs * Math.pow(2, attempt - 1)));
          continue;
        }

        const errMsg = err.response?.data?.error?.message || err.message || 'OpenAI embedding request failed';
        throw new Error(`OpenAI Embedding Error (${status || 'NETWORK'}): ${errMsg}`);
      }
    }

    throw new Error('OpenAI Embedding: Maximum retries exceeded');
  }

  async embedQuery(text: string): Promise<number[]> {
    if (this.fallbackMock) {
      return this.fallbackMock.embedQuery(text);
    }
    const cleanText = text.replace(/\n+/g, ' ').trim();
    if (!cleanText) {
      return new Array(this.dimensions).fill(0);
    }
    const [result] = await this.requestWithRetry([cleanText]);
    return result;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this.fallbackMock) {
      return this.fallbackMock.embedBatch(texts);
    }

    if (texts.length === 0) return [];

    const results: number[][] = [];
    const cleaned = texts.map((t) => t.replace(/\n+/g, ' ').trim() || ' ');

    for (let i = 0; i < cleaned.length; i += this.batchSize) {
      const batch = cleaned.slice(i, i + this.batchSize);
      const batchEmbeddings = await this.requestWithRetry(batch);
      results.push(...batchEmbeddings);
    }

    return results;
  }
}
