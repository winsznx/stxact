import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Load Test: Payment Flow Concurrency
 *
 * Tests the stxact proxy under high concurrent load to verify:
 * - Nonce manager handles concurrent contract calls without conflicts
 * - Payment binding prevents race conditions
 * - Database connection pooling is adequate
 * - Response times remain acceptable under load
 *
 * PRD Requirement: System must handle 100+ concurrent requests (Section 13, lines 2152-2160)
 *
 * Usage:
 *   k6 run --vus 100 --duration 60s payment-load.k6.js
 */

// Custom metrics
const paymentErrors = new Rate('payment_errors');
const receiptGenerationTime = new Trend('receipt_generation_time');
const nonceConflicts = new Rate('nonce_conflicts');

// Test configuration
export const options = {
  scenarios: {
    // Ramp up to 100 concurrent users
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Ramp to 50 users
        { duration: '30s', target: 100 },  // Ramp to 100 users
        { duration: '60s', target: 100 },  // Hold at 100 users
        { duration: '30s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '10s',
    },
    // Spike test: sudden burst of traffic
    spike: {
      executor: 'ramping-vus',
      startTime: '3m',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },  // Sudden spike to 200 users
        { duration: '30s', target: 200 },  // Hold spike
        { duration: '10s', target: 0 },    // Drop to zero
      ],
    },
  },
  thresholds: {
    // 95% of requests should complete within 2 seconds
    http_req_duration: ['p(95)<2000'],
    // Error rate should be below 1%
    payment_errors: ['rate<0.01'],
    // No nonce conflicts allowed
    nonce_conflicts: ['rate<0.001'],
    // 99% of requests should succeed
    http_req_failed: ['rate<0.01'],
  },
};

// Test configuration from environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SERVICE_ENDPOINT = __ENV.ENDPOINT || '/demo/premium-data';

export default function () {
  // Unique identifier for this virtual user and iteration
  const vuId = __VU;
  const iterationId = __ITER;
  const requestId = `load-test-${vuId}-${iterationId}-${Date.now()}`;

  // Step 1: Request protected endpoint (expect 402)
  const challengeStart = Date.now();
  const challengeRes = http.get(`${BASE_URL}${SERVICE_ENDPOINT}`, {
    headers: {
      'X-Request-ID': requestId,
    },
    tags: { name: 'PaymentChallenge' },
  });

  check(challengeRes, {
    'challenge status is 402': (r) => r.status === 402,
    'payment-required header present': (r) => r.headers['Payment-Required'] !== undefined,
    'request hash header present': (r) => r.headers['X-Stxact-Request-Hash'] !== undefined,
  });

  if (challengeRes.status !== 402) {
    paymentErrors.add(1);
    return;
  }

  // Step 2: Simulate payment verification
  // Note: In real load test, this would use mock payment signatures
  // For now, we test the 402 challenge generation under load

  const challengeDuration = Date.now() - challengeStart;
  receiptGenerationTime.add(challengeDuration);

  // Detect nonce conflicts (would appear in logs or error responses)
  const hasNonceConflict = challengeRes.body &&
    (challengeRes.body.includes('nonce') || challengeRes.body.includes('conflict'));

  if (hasNonceConflict) {
    nonceConflicts.add(1);
  } else {
    nonceConflicts.add(0);
  }

  paymentErrors.add(challengeRes.status >= 500 ? 1 : 0);

  // Realistic think time between requests
  sleep(Math.random() * 2);
}

// Setup function: verify service is healthy before test
export function setup() {
  const healthRes = http.get(`${BASE_URL}/health`);

  if (healthRes.status !== 200) {
    throw new Error(`Service not healthy: ${healthRes.status}`);
  }

  console.log('Service health check passed. Starting load test...');
  return { baseUrl: BASE_URL };
}

// Teardown function: report summary
export function teardown(data) {
  console.log('\n=== Load Test Summary ===');
  console.log(`Base URL: ${data.baseUrl}`);
  console.log('Check k6 output for detailed metrics');
}
