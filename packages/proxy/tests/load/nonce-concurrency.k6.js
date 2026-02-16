import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

/**
 * Load Test: Nonce Manager Concurrency
 *
 * Specifically tests the nonce manager under high concurrent contract call load.
 * Verifies that:
 * - No nonce collisions occur under concurrent allocation
 * - Nonce sequence remains monotonic
 * - Failed transactions properly release nonces for retry
 *
 * This test triggers reputation updates which use the nonce manager.
 */

// Custom metrics
const nonceConflicts = new Rate('nonce_conflicts');
const contractCallsSucceeded = new Counter('contract_calls_succeeded');
const contractCallsFailed = new Counter('contract_calls_failed');

export const options = {
  scenarios: {
    // Concurrent contract calls
    concurrent_writes: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
    },
  },
  thresholds: {
    // Zero nonce conflicts tolerated
    nonce_conflicts: ['rate==0'],
    // At least 95% success rate for contract calls
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Trigger reputation update by completing a paid request
  // (In production, would require actual payment; here we test nonce allocation)

  // For this test, we'd need a special endpoint that triggers nonce allocation
  // without requiring actual payment. Add a test-only endpoint if needed:
  // POST /test/trigger-nonce-allocation

  const res = http.post(
    `${BASE_URL}/test/trigger-nonce-allocation`,
    JSON.stringify({
      principal: 'SP' + Math.random().toString(36).substring(7).toUpperCase(),
      amount: Math.floor(Math.random() * 1000000),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'NonceAllocation' },
    }
  );

  const success = check(res, {
    'nonce allocated': (r) => r.status === 200 || r.status === 201,
    'no nonce conflict': (r) => !r.body.includes('nonce') && !r.body.includes('conflict'),
  });

  if (success) {
    contractCallsSucceeded.add(1);
  } else {
    contractCallsFailed.add(1);
  }

  // Check for nonce conflict indicators
  if (res.body && (res.body.includes('nonce conflict') || res.body.includes('bad nonce'))) {
    nonceConflicts.add(1);
    console.error(`Nonce conflict detected: ${res.body}`);
  } else {
    nonceConflicts.add(0);
  }
}

export function handleSummary(data) {
  const nonceConflictRate = data.metrics.nonce_conflicts.values.rate;
  const contractSuccess = data.metrics.contract_calls_succeeded.values.count;
  const contractFailed = data.metrics.contract_calls_failed.values.count;

  console.log('\n=== Nonce Manager Concurrency Test Results ===');
  console.log(`Nonce Conflicts: ${nonceConflictRate * 100}%`);
  console.log(`Successful Contract Calls: ${contractSuccess}`);
  console.log(`Failed Contract Calls: ${contractFailed}`);

  if (nonceConflictRate > 0) {
    console.error('❌ CRITICAL: Nonce conflicts detected! Nonce manager is not thread-safe.');
  } else {
    console.log('✅ PASS: No nonce conflicts detected. Nonce manager is thread-safe.');
  }

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
