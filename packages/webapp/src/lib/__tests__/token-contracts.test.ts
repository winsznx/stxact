import { describe, it, expect, beforeEach } from 'vitest';
import { getSbtcContract, getSbtcContractId, getBnsContract, getBnsContractId } from '../token-contracts';
import { resetNetworkCache } from '../network';

describe('token-contracts', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    process.env.NODE_ENV = 'test';
  });

  it('returns mainnet sBTC contract id', () => {
    expect(getSbtcContractId('mainnet')).toBe('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token');
  });

  it('returns testnet sBTC contract id', () => {
    expect(getSbtcContractId('testnet')).toBe('ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token');
  });

  it('returns mainnet BNS contract id', () => {
    expect(getBnsContractId('mainnet')).toBe('SP000000000000000000002Q6VF78.bns');
  });

  it('returns testnet BNS contract id', () => {
    expect(getBnsContractId('testnet')).toBe('ST000000000000000000002AMW42H.bns');
  });

  it('falls back to current network', () => {
    process.env.NEXT_PUBLIC_STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getBnsContract().address).toBe('SP000000000000000000002Q6VF78');
  });
});
