import { Router, Request, Response } from 'express';
import { getPool } from '../storage/db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const start = Date.now();

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    const dbLatencyMs = Date.now() - start;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: { connected: true, latency_ms: dbLatencyMs },
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      db: { connected: false },
    });
  }
});

export default router;


/**
 * Strongly typed response format for health endpoints.
 * Enables consumers to safely destructure uptime and status.
 */
export interface StrictHealthResponse { readonly status: 'ok' | 'error'; readonly uptime: number; readonly timestamp: string; readonly version?: string; }
