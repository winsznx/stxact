import {
  getServiceRegistry,
  getReputationMap,
  getDisputeResolver,
  getReceiptAnchor,
} from '../../src/config/contracts';

describe('config/contracts', () => {
  beforeEach(() => {
    delete process.env.SERVICE_REGISTRY_ADDRESS;
    delete process.env.REPUTATION_MAP_ADDRESS;
    delete process.env.DISPUTE_RESOLVER_ADDRESS;
    delete process.env.RECEIPT_ANCHOR_ADDRESS;
  });

  it('throws when SERVICE_REGISTRY_ADDRESS missing', () => {
    expect(() => getServiceRegistry()).toThrow(/required/);
  });

  it('throws when REPUTATION_MAP_ADDRESS missing', () => {
    expect(() => getReputationMap()).toThrow(/required/);
  });

  it('throws when DISPUTE_RESOLVER_ADDRESS missing', () => {
    expect(() => getDisputeResolver()).toThrow(/required/);
  });

  it('returns null when RECEIPT_ANCHOR_ADDRESS unset', () => {
    expect(getReceiptAnchor()).toBeNull();
  });

  it('parses valid address.name into ContractRef', () => {
    process.env.SERVICE_REGISTRY_ADDRESS = 'SP1ABC.service-registry';
    const c = getServiceRegistry();
    expect(c.address).toBe('SP1ABC');
    expect(c.name).toBe('service-registry');
    expect(c.fullId).toBe('SP1ABC.service-registry');
  });

  it('rejects malformed contract reference', () => {
    process.env.SERVICE_REGISTRY_ADDRESS = 'malformed-no-dot';
    expect(() => getServiceRegistry()).toThrow(/<address>\.<contract-name>/);
  });
});
