import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './config/logger';
import { testConnection, closePool } from './storage/db';
import { closeRedisClient } from './storage/cache';
import { validateEnv } from './config/env';

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * Initialize application
 * Validates environment, tests connections, sets up middleware
 */
async function initializeApp(): Promise<void> {
  try {
    // Validate environment variables
    validateEnv();

    // Test database connection
    await testConnection();

    logger.info('stxact proxy initializing', {
      port: PORT,
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

/**
 * Middleware Configuration
 * Order matters: helmet → cors → rate-limit → body-parser
 */

// Security headers (PRD Section 14, lines 2273-2283)
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// CORS configuration (PRD Section 14, lines 2287-2303)
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: process.env.NODE_ENV === 'production',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'payment-signature', // x402 v2 header (lowercase)
      'X-Idempotency-Key',
      'X-Buyer-Signature',
    ],
    exposedHeaders: [
      'payment-required', // x402 v2 header (lowercase)
      'payment-response', // x402 v2 header (lowercase)
      'X-stxact-Receipt-ID',
      'X-stxact-Deliverable-Hash',
      'X-stxact-Signature',
      'X-stxact-Receipt',
      'X-stxact-Request-Hash',
      'X-stxact-Service-Principal',
      'X-stxact-Service-BNS',
      'X-stxact-Service-Policy-Hash',
    ],
    maxAge: 86400, // 24 hours
  })
);

// Rate limiting (PRD Section 14)
// Global rate limit: 1000 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Note: 402 challenge rate limiting is now handled by x402-stacks paymentMiddleware

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
  });

  next();
});

/**
 * Health Check Endpoint
 * PRD Section 18 - Deployment Package
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

/**
 * Well-known endpoint for stxact capabilities
 * PRD Section 7 - API Specification
 */
app.get('/.well-known/stxact-config', async (_req, res) => {
  try {
    const config = {
      version: '1.0.0',
      service_principal: process.env.SERVICE_PRINCIPAL,
      service_bns_name: process.env.SERVICE_BNS_NAME || null,
      policy_hash: process.env.SERVICE_POLICY_HASH || null,
      policy_url: process.env.SERVICE_POLICY_URL || null,
      features: {
        delivery_proofs: true,
        async_jobs: true,
        dispute_resolution: true,
        receipt_anchoring: process.env.ENABLE_RECEIPT_ANCHORING === 'true',
      },
      supported_tokens: [
        {
          network: 'stacks',
          token_contract: 'SP2ASJZHEKV2MBDYWS1HT63WXYXWX49NF.sbtc-token',
          symbol: 'sBTC',
        },
      ],
      endpoints: [
        {
          path: '/receipts/verify',
          method: 'POST',
          description: 'Verify receipt signature and delivery proof',
        },
        {
          path: '/directory/services',
          method: 'GET',
          description: 'Query service directory',
        },
      ],
    };

    res.status(200).json(config);
  } catch (error) {
    logger.error('Failed to generate stxact config', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * API Routes
 */
import receiptsRouter from './api/receipts';
import directoryRouter from './api/directory';
import disputesRouter from './api/disputes';
import reputationRouter from './api/reputation';
import demoRouter from './api/demo';

app.use('/receipts', receiptsRouter);
app.use('/directory', directoryRouter);
app.use('/disputes', disputesRouter);
app.use('/reputation', reputationRouter);
app.use('/demo', demoRouter);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/**
 * Global error handler
 */
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Close database connections
  await closePool();

  // Close Redis connections
  await closeRedisClient();

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start server
 */
async function start(): Promise<void> {
  await initializeApp();

  app.listen(PORT, () => {
    logger.info('stxact proxy started', {
      port: PORT,
      environment: process.env.NODE_ENV,
    });
  });
}

// Start the server if this file is executed directly
if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

export { app, start };
