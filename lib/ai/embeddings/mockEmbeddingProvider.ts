import crypto from 'crypto';
import { EmbeddingProvider } from './types';

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = 'mock';
  readonly modelName = 'mock-embedding-1536';
  readonly dimensions = 1536;

  private generateDeterministicVector(text: string): number[] {
    const vec: number[] = new Array(this.dimensions);
    // Use SHA-256 rounds to seed deterministic pseudo-random floats
    let hash = crypto.createHash('sha256').update(text).digest();
    let norm = 0;

    for (let i = 0; i < this.dimensions; i++) {
      if (i % 32 === 0 && i > 0) {
        hash = crypto.createHash('sha256').update(hash).digest();
      }
      const byteVal = hash[i % 32];
      // Map to [-1, 1]
      const val = (byteVal - 128) / 128.0;
      vec[i] = val;
      norm += val * val;
    }

    // Normalize to unit vector for cosine distance
    const sqrtNorm = Math.sqrt(norm) || 1;
    for (let i = 0; i < this.dimensions; i++) {
      vec[i] = vec[i] / sqrtNorm;
    }

    return vec;
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateDeterministicVector(t));
  }
}
