import { getRedisConnection, isRedisAvailable } from '@/lib/queue/redis';

export interface ExecutionLockResult {
  acquired: boolean;
  token?: string;
  lockKey: string;
}

// In-memory lock registry for test environments or when Redis is offline
const inMemoryLocks = new Map<string, { token: string; expiresAt: number }>();

export class ExecutionLockService {
  private static readonly DEFAULT_TTL_SECONDS = 60; // 60s auto-release for crash recovery

  /**
   * Attempts to acquire a distributed execution lock.
   * Key: automation:execution:{executionId}
   */
  static async acquire(
    executionId: string,
    ttlSeconds = this.DEFAULT_TTL_SECONDS
  ): Promise<ExecutionLockResult> {
    const lockKey = `automation:execution:${executionId}`;
    const token = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Redis Distributed Lock
    if (isRedisAvailable() && process.env.NODE_ENV !== 'test') {
      try {
        const redis = getRedisConnection();
        const result = await redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');
        if (result === 'OK') {
          return { acquired: true, token, lockKey };
        }
        return { acquired: false, lockKey };
      } catch (err) {
        console.warn('[ExecutionLock] Redis lock acquisition error, falling back to local lock:', err);
      }
    }

    // 2. Local Fallback (in-memory test / dev fallback)
    const now = Date.now();
    const existing = inMemoryLocks.get(lockKey);
    if (existing && existing.expiresAt > now) {
      return { acquired: false, lockKey };
    }

    inMemoryLocks.set(lockKey, {
      token,
      expiresAt: now + ttlSeconds * 1000,
    });

    return { acquired: true, token, lockKey };
  }

  /**
   * Releases an acquired lock safely.
   */
  static async release(executionId: string, token?: string): Promise<boolean> {
    const lockKey = `automation:execution:${executionId}`;

    // 1. Release from Redis
    if (isRedisAvailable() && process.env.NODE_ENV !== 'test') {
      try {
        const redis = getRedisConnection();
        if (token) {
          // Atomic compare and delete via Lua script
          const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redis.eval(luaScript, 1, lockKey, token);
        } else {
          await redis.del(lockKey);
        }
      } catch (err) {
        console.warn('[ExecutionLock] Failed to release Redis lock:', err);
      }
    }

    // 2. Release from local fallback
    const local = inMemoryLocks.get(lockKey);
    if (!token || (local && local.token === token)) {
      inMemoryLocks.delete(lockKey);
      return true;
    }

    return false;
  }

  /**
   * Checks whether a lock is currently active.
   */
  static async isLocked(executionId: string): Promise<boolean> {
    const lockKey = `automation:execution:${executionId}`;

    if (isRedisAvailable() && process.env.NODE_ENV !== 'test') {
      try {
        const redis = getRedisConnection();
        const value = await redis.get(lockKey);
        return value !== null;
      } catch (err) {
        console.warn('[ExecutionLock] Failed to check Redis lock:', err);
      }
    }

    const now = Date.now();
    const existing = inMemoryLocks.get(lockKey);
    return Boolean(existing && existing.expiresAt > now);
  }

  /**
   * Clears in-memory locks (used in test setup/teardown).
   */
  static clearTestLocks(): void {
    inMemoryLocks.clear();
  }
}
