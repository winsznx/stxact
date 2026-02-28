import Redis from 'ioredis';
import { logger } from '../config/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected', { url: redisUrl });
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error', {
        error: error.message,
        stack: error.stack,
      });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}

/**
 * Idempotency Cache
 *
 * Caches responses for duplicate requests with the same (request_hash, idempotency_key)
 * TTL: 10 minutes (2x timestamp bucket size, default 600 seconds)
 *
 * PRD Reference: Section 8 - Idempotency Key Behavior (lines 1166-1182)
 */
export interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export async function checkIdempotency(
  requestHash: string,
  idempotencyKey: string
): Promise<CachedResponse | null> {
  const redis = getRedisClient();
  const cacheKey = `idempotency:${requestHash}:${idempotencyKey}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.debug('Idempotency cache hit', {
        request_hash: requestHash,
        idempotency_key: idempotencyKey,
      });

      return JSON.parse(cached) as CachedResponse;
    }

    return null;
  } catch (error) {
    logger.error('Failed to check idempotency cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
      request_hash: requestHash,
      idempotency_key: idempotencyKey,
    });

    return null;
  }
}

export async function cacheResponse(
  requestHash: string,
  idempotencyKey: string,
  response: CachedResponse,
  ttlSeconds: number = parseInt(process.env.IDEMPOTENCY_CACHE_TTL || '600', 10)
): Promise<void> {
  const redis = getRedisClient();
  const cacheKey = `idempotency:${requestHash}:${idempotencyKey}`;

  try {
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(response));

    logger.debug('Response cached for idempotency', {
      request_hash: requestHash,
      idempotency_key: idempotencyKey,
      ttl_seconds: ttlSeconds,
    });
  } catch (error) {
    logger.error('Failed to cache response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      request_hash: requestHash,
      idempotency_key: idempotencyKey,
    });
  }
}

/**
 * BNS Cache
 *
 * Caches BNS name lookups to reduce on-chain queries
 * TTL: 1 hour (3600 seconds) as specified in PRD Section 9
 */
export interface BNSCacheEntry {
  owner_principal: string;
  cached_at: number;
}

export async function getBNSCacheEntry(bnsName: string): Promise<string | null> {
  const redis = getRedisClient();
  const cacheKey = `bns:${bnsName}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.debug('BNS cache hit', { bns_name: bnsName });
      const entry: BNSCacheEntry = JSON.parse(cached);
      return entry.owner_principal;
    }

    return null;
  } catch (error) {
    logger.error('Failed to get BNS cache entry', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bns_name: bnsName,
    });

    return null;
  }
}

export async function setBNSCacheEntry(
  bnsName: string,
  ownerPrincipal: string,
  ttlSeconds: number = parseInt(process.env.BNS_CACHE_TTL || '3600', 10)
): Promise<void> {
  const redis = getRedisClient();
  const cacheKey = `bns:${bnsName}`;

  const entry: BNSCacheEntry = {
    owner_principal: ownerPrincipal,
    cached_at: Date.now(),
  };

  try {
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(entry));

    logger.debug('BNS entry cached', {
      bns_name: bnsName,
      owner_principal: ownerPrincipal,
      ttl_seconds: ttlSeconds,
    });
  } catch (error) {
    logger.error('Failed to cache BNS entry', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bns_name: bnsName,
    });
  }
}

export async function invalidateBNSCache(bnsName: string): Promise<void> {
  const redis = getRedisClient();
  const cacheKey = `bns:${bnsName}`;

  try {
    await redis.del(cacheKey);
    logger.info('BNS cache invalidated', { bns_name: bnsName });
  } catch (error) {
    logger.error('Failed to invalidate BNS cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bns_name: bnsName,
    });
  }
}
