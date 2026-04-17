import { describe, it, expect } from 'vitest';
import { getServiceScore, getServiceTotalVolume, getServiceDeliveries, getServiceDisputes } from '../service-utils';
import type { Service } from '../api';

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    principal: 'ST1ABC', bns_name: null, endpoint_url: 'https://api.example.com',
    policy_hash: 'a'.repeat(64), policy_url: null, category: 'data-api',
    supported_tokens: [{ symbol: 'STX' }], registered_at: Date.now(), ...overrides,
  };
}

describe('getServiceScore', () => {
  it('returns reputation_score when present', () => { expect(getServiceScore(makeService({ reputation_score: 85 }))).toBe(85); });
  it('returns 0 when no score', () => { expect(getServiceScore(makeService())).toBe(0); });
});

describe('getServiceTotalVolume', () => {
  it('returns total_volume', () => { expect(getServiceTotalVolume(makeService({ total_volume: '5000' }))).toBe('5000'); });
});

describe('getServiceDeliveries', () => {
  it('returns 0 when missing', () => { expect(getServiceDeliveries(makeService())).toBe(0); });
});

describe('getServiceDisputes', () => {
  it('returns 0 when missing', () => { expect(getServiceDisputes(makeService())).toBe(0); });
});
