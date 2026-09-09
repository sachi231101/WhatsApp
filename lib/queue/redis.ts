import Redis, { type RedisOptions } from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedisOptions(): RedisOptions {
  if (process.env.REDIS_URL) {
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  };
}

export function isRedisAvailable(): boolean {
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

export function getRedisConnection(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL;
    const options = getRedisOptions();
    if (url) {
      redisInstance = new Redis(url, options);
    } else {
      redisInstance = new Redis(options);
    }

    redisInstance.on('error', (err) => {
      // Avoid unhandled crash in dev/test when redis is not running
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Redis] Connection warning:', err.message);
      }
    });
  }

  return redisInstance;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    }
    redisInstance = null;
  }
}
