import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageResult {
  key: string;
  checksum: string;
  size: number;
}

export interface StorageProvider {
  saveFile(key: string, buffer: Buffer, contentType?: string): Promise<StorageResult>;
  readFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean>;
}

const DISALLOWED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.mjs',
  '.cjs', '.py', '.php', '.jar', '.com', '.scr', '.pif', '.hta', '.msi'
]);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'storage', 'knowledge');
  }

  private resolveSafePath(key: string): string {
    if (!key || key.includes('..') || path.isAbsolute(key)) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    const safeKey = key.replace(/^[/\\]+/, '');
    const resolved = path.resolve(this.baseDir, safeKey);
    if (!resolved.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return resolved;
  }

  async saveFile(key: string, buffer: Buffer, _contentType?: string): Promise<StorageResult> {
    const ext = path.extname(key).toLowerCase();
    if (DISALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Uploading executable or dangerous files with extension "${ext}" is strictly forbidden.`);
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size ${buffer.length} bytes exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES} bytes.`);
    }

    const filePath = this.resolveSafePath(key);
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(filePath, buffer);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      key,
      checksum,
      size: buffer.length,
    };
  }

  async readFile(key: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(key);
    return await fs.promises.readFile(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.resolveSafePath(key);
    return fs.existsSync(filePath);
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorageProvider();
  }
  return storageInstance;
}
