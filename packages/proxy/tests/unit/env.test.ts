import { randomBytes } from 'crypto';
import { deriveServicePrincipal, validateEnv } from '../../src/config/env';

const TEST_PRIVATE_KEY = `${randomBytes(32).toString('hex')}01`;

const REQUIRED_ENV = {
  POSTGRES_PASSWORD: 'postgres-password',
  SELLER_PRIVATE_KEY: TEST_PRIVATE_KEY,
  SERVICE_REGISTRY_ADDRESS: 'STTEST.service-registry',
  REPUTATION_MAP_ADDRESS: 'STTEST.reputation-map',
  DISPUTE_RESOLVER_ADDRESS: 'STTEST.dispute-resolver',
};

describe('env validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ...REQUIRED_ENV,
      STACKS_NETWORK: 'testnet',
      SERVICE_PRINCIPAL: deriveServicePrincipal(TEST_PRIVATE_KEY, 'testnet'),
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts a service principal derived from the configured seller key', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('rejects a mismatched service principal', () => {
    process.env.SERVICE_PRINCIPAL = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

    expect(() => validateEnv()).toThrow(
      /SERVICE_PRINCIPAL must match SELLER_PRIVATE_KEY derived address/
    );
  });
});
