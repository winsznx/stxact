import { getAddressFromPrivateKey, TransactionVersion } from '@stacks/transactions';
import { logger } from './logger';

/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on startup.
 * Throws clear error if missing required variables.
 *
 * PRD Reference: Task 66 - Environment Variable Validation
 */

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'url';
    defaultValue?: string | number | boolean;
    description: string;
  };
}

const envVarDefinitions: RequiredEnvVars = {
  // Server
  PORT: {
    required: false,
    type: 'number',
    defaultValue: 3001,
    description: 'Server port',
  },
  NODE_ENV: {
    required: false,
    type: 'string',
    defaultValue: 'development',
    description: 'Node environment',
  },
  LOG_LEVEL: {
    required: false,
    type: 'string',
    defaultValue: 'info',
    description: 'Logging level',
  },

  // Database
  POSTGRES_HOST: {
    required: false,
    type: 'string',
    defaultValue: 'localhost',
    description: 'PostgreSQL host',
  },
  POSTGRES_PORT: {
    required: false,
    type: 'number',
    defaultValue: 5432,
    description: 'PostgreSQL port',
  },
  POSTGRES_DB: {
    required: false,
    type: 'string',
    defaultValue: 'stxact',
    description: 'PostgreSQL database name',
  },
  POSTGRES_USER: {
    required: false,
    type: 'string',
    defaultValue: 'stxact',
    description: 'PostgreSQL user',
  },
  POSTGRES_PASSWORD: {
    required: true,
    type: 'string',
    description: 'PostgreSQL password',
  },

  // Redis
  REDIS_URL: {
    required: false,
    type: 'url',
    defaultValue: 'redis://localhost:6379',
    description: 'Redis connection URL',
  },

  // Stacks
  STACKS_NETWORK: {
    required: false,
    type: 'string',
    defaultValue: 'testnet',
    description: 'Stacks network (testnet or mainnet)',
  },
  STACKS_API_URL: {
    required: false,
    type: 'url',
    defaultValue: 'https://api.testnet.hiro.so',
    description: 'Stacks API URL',
  },
  SELLER_PRIVATE_KEY: {
    required: true,
    type: 'string',
    description: 'Seller private key for signing receipts',
  },
  SERVICE_PRINCIPAL: {
    required: true,
    type: 'string',
    description: 'Service principal (derived from SELLER_PRIVATE_KEY)',
  },

  // Clarity Contracts
  SERVICE_REGISTRY_ADDRESS: {
    required: true,
    type: 'string',
    description: 'Deployed service-registry contract address',
  },
  REPUTATION_MAP_ADDRESS: {
    required: true,
    type: 'string',
    description: 'Deployed reputation-map contract address',
  },
  DISPUTE_RESOLVER_ADDRESS: {
    required: true,
    type: 'string',
    description: 'Deployed dispute-resolver contract address',
  },
  RECEIPT_ANCHOR_ADDRESS: {
    required: false,
    type: 'string',
    description: 'Deployed receipt-anchor contract address (optional)',
  },

  // Feature Flags
  ENABLE_RECEIPT_ANCHORING: {
    required: false,
    type: 'boolean',
    defaultValue: false,
    description: 'Enable optional receipt anchoring',
  },
  ENABLE_DEMO_ROUTES: {
    required: false,
    type: 'boolean',
    defaultValue: false,
    description: 'Enable demo-only API routes',
  },
  MIN_REPUTATION_AMOUNT: {
    required: false,
    type: 'number',
    defaultValue: 10000,
    description: 'Minimum payment amount for reputation credit (sats)',
  },

  // Confirmation Depth
  CONFIRMATION_DEPTH_TESTNET: {
    required: false,
    type: 'number',
    defaultValue: 1,
    description: 'Confirmation depth for testnet',
  },
  CONFIRMATION_DEPTH_MAINNET: {
    required: false,
    type: 'number',
    defaultValue: 6,
    description: 'Confirmation depth for mainnet',
  },
};

export function deriveServicePrincipal(privateKey: string, stacksNetwork: string): string {
  const transactionVersion =
    stacksNetwork.toLowerCase() === 'mainnet'
      ? TransactionVersion.Mainnet
      : TransactionVersion.Testnet;

  return getAddressFromPrivateKey(privateKey.trim().replace(/^0x/, ''), transactionVersion);
}

export function validateEnv(): void {
  const missingRequired: string[] = [];
  const invalidTypes: string[] = [];

  for (const [key, config] of Object.entries(envVarDefinitions)) {
    const value = process.env[key];

    // Check required variables
    if (config.required && !value) {
      missingRequired.push(key);
      continue;
    }

    // Apply default values
    if (!value && config.defaultValue !== undefined) {
      process.env[key] = String(config.defaultValue);
      continue;
    }

    // Skip validation if value is not present and not required
    if (!value) {
      continue;
    }

    // Type validation
    switch (config.type) {
      case 'number':
        if (isNaN(Number(value))) {
          invalidTypes.push(`${key} must be a number (got: ${value})`);
        }
        break;

      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          invalidTypes.push(`${key} must be 'true' or 'false' (got: ${value})`);
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          invalidTypes.push(`${key} must be a valid URL (got: ${value})`);
        }
        break;

      case 'string':
        // String validation (already a string)
        break;
    }
  }

  // Report errors
  if (missingRequired.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missingRequired
      .map((key) => {
        const config = envVarDefinitions[key];
        return `  - ${key}: ${config.description}`;
      })
      .join('\n')}`;

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const sellerPrivateKey = process.env.SELLER_PRIVATE_KEY;
  const servicePrincipal = process.env.SERVICE_PRINCIPAL;
  const stacksNetwork = process.env.STACKS_NETWORK || 'testnet';

  if (sellerPrivateKey && servicePrincipal) {
    try {
      const derivedServicePrincipal = deriveServicePrincipal(sellerPrivateKey, stacksNetwork);
      if (derivedServicePrincipal !== servicePrincipal) {
        invalidTypes.push(
          `SERVICE_PRINCIPAL must match SELLER_PRIVATE_KEY derived address (expected: ${derivedServicePrincipal}, got: ${servicePrincipal})`
        );
      }
    } catch (error) {
      invalidTypes.push(
        `SELLER_PRIVATE_KEY could not derive a valid ${stacksNetwork} service principal (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }

  if (invalidTypes.length > 0) {
    const errorMessage = `Invalid environment variable types:\n${invalidTypes
      .map((msg) => `  - ${msg}`)
      .join('\n')}`;

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Log loaded configuration (mask secrets)
  const maskedConfig: Record<string, string> = {};
  for (const key of Object.keys(envVarDefinitions)) {
    const value = process.env[key];
    if (value) {
      maskedConfig[key] =
        key.includes('PASSWORD') || key.includes('KEY') || key.includes('SECRET')
          ? '***MASKED***'
          : value;
    }
  }

  logger.info('Environment variables validated', { config: maskedConfig });
}

/**
 * Get typed configuration value
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;

  return value === 'true';
}

export function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
