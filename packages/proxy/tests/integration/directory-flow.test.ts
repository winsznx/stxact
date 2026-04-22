import { createHash } from 'crypto';
import request from 'supertest';
import { createStacksPrivateKey, signMessageHashRsv } from '@stacks/transactions';
import { app } from '../../src/index';
import { getPool } from '../../src/storage/db';

/**
 * Integration Test: Service Directory Flow
 *
 * Tests service registration, on-chain anchoring, and directory queries.
 *
 * PRD Reference: Section 7 - Directory Endpoints
 */

describe('Service Directory Integration', () => {
  const testPrincipal = process.env.SERVICE_PRINCIPAL!;
  const testEndpointUrl = 'https://test-service.example.com/x402';
  const testPolicyHash = createHash('sha256').update('test-policy').digest('hex');
  const testCategory = 'data-api';
  const validBuyerPrincipal = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  let serviceId: number;

  function signRegistration(
    endpointUrl: string,
    policyHash: string,
    timestamp: number,
    bnsName?: string
  ) {
    const endpointUrlHash = createHash('sha256').update(new URL(endpointUrl).toString()).digest('hex');
    const canonicalMessage = [
      'STXACT-REGISTER',
      endpointUrlHash,
      policyHash.toLowerCase(),
      bnsName || '',
      timestamp.toString(),
    ].join(':');
    const messageHash = createHash('sha256').update(canonicalMessage).digest('hex');
    const signature = signMessageHashRsv({
      messageHash,
      privateKey: createStacksPrivateKey(process.env.SELLER_PRIVATE_KEY!),
    });

    return Buffer.from(signature.data, 'hex').toString('base64');
  }

  beforeEach(async () => {
    // Clean up test data
    const pool = getPool();
    await pool.query('DELETE FROM services WHERE principal = $1', [testPrincipal]);
  });

  describe('Flow 1: Service Registration', () => {
    test.skip('should register service and anchor on-chain', async () => {
      // #when: Service provider registers
      const response = await request(app)
        .post('/directory/register')
        .send({
          endpoint_url: testEndpointUrl,
          policy_hash: testPolicyHash,
          category: testCategory,
          supported_tokens: [
            {
              network: 'stacks',
              asset: 'STX',
            },
          ],
        })
        .expect(201);

      // #then: Service registered with blockchain transaction
      expect(response.body.service_id).toBeDefined();
      expect(response.body.status).toBe('registered');
      expect(response.body.tx_hash).toBeDefined(); // Should NOT be null anymore

      serviceId = response.body.service_id;

      // Verify stored in database
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM services WHERE service_id = $1',
        [serviceId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].principal).toBe(testPrincipal);
      expect(result.rows[0].endpoint_url).toBe(testEndpointUrl);
      expect(result.rows[0].active).toBe(true);
    });

    test('should reject duplicate registration', async () => {
      // #given: Service already registered
      const pool = getPool();
      const timestamp = Math.floor(Date.now() / 1000);
      await pool.query(
        `INSERT INTO services (
          principal, endpoint_url, policy_hash, category,
          supported_tokens, registered_at, stake_amount, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          testPrincipal,
          testEndpointUrl,
          testPolicyHash,
          testCategory,
          JSON.stringify([{ network: 'stacks', asset: 'STX' }]),
          Math.floor(Date.now() / 1000),
          100_000_000,
          true,
        ]
      );

      // #when: Attempt duplicate registration
      const endpointUrl = 'https://different-url.com';
      const response = await request(app)
        .post('/directory/register')
        .send({
          endpoint_url: endpointUrl,
          policy_hash: testPolicyHash,
          category: testCategory,
          supported_tokens: [{ network: 'stacks', asset: 'STX' }],
          signature: signRegistration(endpointUrl, testPolicyHash, timestamp),
          timestamp,
        })
        .expect(409);

      // #then: Should reject with already registered error
      expect(response.body.error).toBe('already_registered');
    });

    test('should require all mandatory fields', async () => {
      // #when: Register without required fields
      const response = await request(app)
        .post('/directory/register')
        .send({
          endpoint_url: testEndpointUrl,
          // Missing: policy_hash, category, supported_tokens
        })
        .expect(400);

      // #then: Should reject with missing fields error
      expect(response.body.error).toBe('missing_fields');
    });

    test.skip('should verify BNS name ownership if provided', async () => {
      // #given: BNS name provided
      const bnsName = 'test-service.btc';

      // #when: Register with BNS name
      // (Requires mocking BNS contract calls)

      // #then: Should verify ownership via BNS contract
      // If not owned by seller: reject with bns_verification_failed
    });

    test.skip('should verify policy hash matches policy URL', async () => {
      // #given: Policy URL provided
      const policyUrl = 'https://test-service.com/policy.txt';

      // #when: Register with policy URL
      // (Requires mocking HTTP fetch)

      // #then: Should fetch policy content and verify hash
      // If mismatch: reject with policy_hash_mismatch
    });
  });

  describe('Flow 2: Directory Queries', () => {
    beforeEach(async () => {
      // Register test services
      const pool = getPool();

      await pool.query(
        `INSERT INTO services (
          principal, endpoint_url, policy_hash, category,
          supported_tokens, registered_at, stake_amount, active, bns_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testPrincipal,
          'https://service1.example.com',
          'hash1',
          'data-api',
          JSON.stringify([{ network: 'stacks', asset: 'STX' }]),
          Math.floor(Date.now() / 1000),
          100_000_000,
          true,
          'service1.btc',
        ]
      );

      await pool.query(
        `INSERT INTO services (
          principal, endpoint_url, policy_hash, category,
          supported_tokens, registered_at, stake_amount, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          validBuyerPrincipal,
          'https://service2.example.com',
          'hash2',
          'ai-compute',
          JSON.stringify([{ network: 'stacks', asset: 'sBTC' }]),
          Math.floor(Date.now() / 1000),
          200_000_000,
          true,
        ]
      );
    });

    test('should list all active services', async () => {
      // #when: Query directory
      const response = await request(app)
        .get('/directory/services')
        .expect(200);

      // #then: Returns all active services
      expect(response.body.services).toBeDefined();
      expect(response.body.services.length).toBeGreaterThanOrEqual(2);

      const service = response.body.services.find(
        (s: { principal?: string }) => s.principal === testPrincipal
      );
      expect(service).toBeDefined();
      expect(service.endpoint_url).toBe('https://service1.example.com');
      expect(service.category).toBe('data-api');
    });

    test('should filter by category', async () => {
      // #when: Query with category filter
      const response = await request(app)
        .get('/directory/services?category=data-api')
        .expect(200);

      // #then: Returns only matching category
      expect(response.body.services).toBeDefined();
      const categories = response.body.services.map((s: { category: string }) => s.category);
      expect(categories.every((c: string) => c === 'data-api')).toBe(true);
    });

    test('should filter by supported token', async () => {
      // #when: Query with token filter
      const response = await request(app)
        .get('/directory/services?token=sBTC')
        .expect(200);

      // #then: Returns only services supporting sBTC
      expect(response.body.services).toBeDefined();
      expect(response.body.services.length).toBeGreaterThanOrEqual(1);

      const service = response.body.services.find(
        (s: { principal?: string }) => s.principal === validBuyerPrincipal
      );
      expect(service).toBeDefined();
    });

    test('should resolve service by BNS name', async () => {
      // #when: Query by BNS name
      const response = await request(app)
        .get('/directory/services/service1.btc')
        .expect(200);

      // #then: Returns service details
      expect(response.body.principal).toBe(testPrincipal);
      expect(response.body.endpoint_url).toBe('https://service1.example.com');
      expect(response.body.bns_name).toBe('service1.btc');
    });

    test('should return 404 for non-existent BNS name', async () => {
      // #when: Query non-existent BNS name
      const response = await request(app)
        .get('/directory/services/non-existent.btc')
        .expect(404);

      // #then: Returns not found error
      expect(response.body.error).toBe('service_not_found');
    });

    test('should return reputation data with service listing', async () => {
      // #given: Service has reputation data
      const pool = getPool();
      const principal = testPrincipal;

      // Mock reputation data (in production, fetched from on-chain)
      await pool.query(
        `UPDATE services
         SET reputation_score = $1
         WHERE principal = $2`,
        [95, principal]
      );

      // #when: Query service
      const response = await request(app)
        .get('/directory/services/service1.btc')
        .expect(200);

      // #then: Includes reputation data
      expect(response.body.reputation_score).toBeDefined();
    });
  });

  describe('Flow 3: Service Updates', () => {
    test.skip('should allow service owner to update endpoint', async () => {
      // #given: Service registered
      // #when: Owner updates endpoint URL
      // #then: Should update and re-anchor on-chain
    });

    test.skip('should prevent non-owner from updating service', async () => {
      // #given: Different principal attempts update
      // #then: Should reject with unauthorized error
    });
  });

  describe('Flow 4: Service Deactivation', () => {
    test.skip('should allow owner to deactivate service', async () => {
      // #given: Active service
      // #when: Owner deactivates
      // #then: Service marked inactive, removed from listings
    });

    test.skip('should require unstaking period before withdrawal', async () => {
      // #given: Service deactivated
      // #then: Stake locked for 7 days (PRD requirement)
    });
  });
});
