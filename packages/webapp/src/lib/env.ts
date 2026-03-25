import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://127.0.0.1:3001'),
  NEXT_PUBLIC_STACKS_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  NEXT_PUBLIC_STACKS_API_URL: z.string().url().default('https://api.testnet.hiro.so'),
  NEXT_PUBLIC_APP_NAME: z.string().default('stxact'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_DISPUTES: z.string().default('true').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_RECEIPT_ANCHORING: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_REPUTATION: z.string().default('true').transform((val) => val === 'true'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
});

/**
 * Core definition structure for Env.
 */
export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Executes logic associated with get env.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_STACKS_NETWORK: process.env.NEXT_PUBLIC_STACKS_NETWORK,
      NEXT_PUBLIC_STACKS_API_URL: process.env.NEXT_PUBLIC_STACKS_API_URL,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_ENABLE_DISPUTES: process.env.NEXT_PUBLIC_ENABLE_DISPUTES,
      NEXT_PUBLIC_ENABLE_RECEIPT_ANCHORING: process.env.NEXT_PUBLIC_ENABLE_RECEIPT_ANCHORING,
      NEXT_PUBLIC_ENABLE_REPUTATION: process.env.NEXT_PUBLIC_ENABLE_REPUTATION,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    });

    return cachedEnv;
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Environment validation failed. Check console for details.');
  }
}

/**
 * Exported constant for env.
 */
export const env = getEnv();
