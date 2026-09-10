export interface EmbeddingProvider {
  readonly providerName: string;
  readonly modelName: string;
  readonly dimensions: number;

  embedQuery(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface EmbeddingOptions {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
}
