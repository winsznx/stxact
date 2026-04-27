import { getSbtcContract, getSbtcContractId, getBnsContract, getBnsContractId } from '../../src/config/token-contracts';
import { resetNetworkCache } from '../../src/config/network';

describe('token-contracts', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns mainnet sBTC contract', () => {
    expect(getSbtcContract('mainnet').address).toBe('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4');
  });

  it('returns testnet sBTC contract', () => {
    expect(getSbtcContract('testnet').address).toBe('ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT');
  });

  it('builds full sBTC contract id', () => {
    expect(getSbtcContractId('mainnet')).toBe('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token');
  });

  it('returns mainnet BNS contract', () => {
    expect(getBnsContract('mainnet').address).toBe('SP000000000000000000002Q6VF78');
  });

  it('returns testnet BNS contract', () => {
    expect(getBnsContract('testnet').address).toBe('ST000000000000000000002AMW42H');
  });

  it('builds full BNS contract id', () => {
    expect(getBnsContractId('testnet')).toBe('ST000000000000000000002AMW42H.bns');
  });

  it('falls back to current network when no arg', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getSbtcContract().address).toBe('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4');
  });
});
