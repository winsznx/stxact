import { Pool, PoolConfig } from 'pg';
import { logger } from '../config/logger';

/**
 * PostgreSQL Connection Pool Configuration
 *
 * IMPORTANT: This module assumes validateEnv() has been called during application startup.
 * validateEnv() sets default values for all optional environment variables.
 * Never use hardcoded fallback defaults - they bypass environment validation.
 *
 * PRD Reference: Section 15 - Performance + Reliability (Connection Pooling)
 */

const poolConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST!,
  port: parseInt(process.env.POSTGRES_PORT!, 10),
  database: process.env.POSTGRES_DB!,
  user: process.env.POSTGRES_USER!,
  password: process.env.POSTGRES_PASSWORD!,
  max: 20, // Max 20 connections as specified in PRD Section 15
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    pool.on('error', (error, _client) => {
      logger.error('Unexpected error on idle PostgreSQL client', {
        error: error.message,
        stack: error.stack,
      });
    });

    pool.on('connect', (_client) => {
      logger.debug('New PostgreSQL client connected to pool');
    });

    pool.on('remove', (_client) => {
      logger.debug('PostgreSQL client removed from pool');
    });

    logger.info('PostgreSQL connection pool initialized', {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      maxConnections: poolConfig.max,
    });
  }

  return pool;
}

export async function testConnection(): Promise<void> {
  const testPool = getPool();
  try {
    const result = await testPool.query('SELECT NOW() as current_time');
    logger.info('PostgreSQL connection test successful', {
      currentTime: result.rows[0].current_time,
    });
  } catch (error) {
    logger.error('PostgreSQL connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection pool closed');
  }
}

export { pool };


/**
 * Exhaustive union representing the underlying database socket state.
 */
export type DbConnectionState = 'connected' | 'disconnected' | 'reconnecting';
