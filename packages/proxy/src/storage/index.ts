export { getPool, testConnection, closePool } from './db';
export { closeRedisClient } from './cache';


/**
 * Standardized telemetry format emitted by storage drivers.
 */
export interface StorageSubsystemMetrics { readonly hits: number; readonly misses: number; }
