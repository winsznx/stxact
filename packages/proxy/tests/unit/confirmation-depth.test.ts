import { getConfirmationDepth, isConfirmedAtDepth } from '../../src/config/confirmation-depth';
import { resetNetworkCache } from '../../src/config/network';

describe('confirmation-depth', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    delete process.env.CONFIRMATION_DEPTH_MAINNET;
    delete process.env.CONFIRMATION_DEPTH_TESTNET;
    process.env.NODE_ENV = 'test';
  });

  it('returns mainnet default of 6 confirmations', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getConfirmationDepth()).toBe(6);
  });

  it('returns testnet default of 1 confirmation', () => {
    process.env.STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(getConfirmationDepth()).toBe(1);
  });

  it('honors CONFIRMATION_DEPTH_MAINNET override', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    process.env.CONFIRMATION_DEPTH_MAINNET = '12';
    resetNetworkCache();
    expect(getConfirmationDepth()).toBe(12);
  });

  it('honors CONFIRMATION_DEPTH_TESTNET override', () => {
    process.env.STACKS_NETWORK = 'testnet';
    process.env.CONFIRMATION_DEPTH_TESTNET = '3';
    resetNetworkCache();
    expect(getConfirmationDepth()).toBe(3);
  });

  it('falls back to default when override is non-numeric', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    process.env.CONFIRMATION_DEPTH_MAINNET = 'not-a-number';
    resetNetworkCache();
    expect(getConfirmationDepth()).toBe(6);
  });

  it('isConfirmedAtDepth returns false when tip is below depth threshold', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(isConfirmedAtDepth(100, 102)).toBe(false);
  });

  it('isConfirmedAtDepth returns true when tip exceeds depth threshold', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(isConfirmedAtDepth(100, 110)).toBe(true);
  });

  it('isConfirmedAtDepth treats exactly-at-depth as confirmed', () => {
    process.env.STACKS_NETWORK = 'testnet';
    resetNetworkCache();
    expect(isConfirmedAtDepth(100, 101)).toBe(true);
  });
});
