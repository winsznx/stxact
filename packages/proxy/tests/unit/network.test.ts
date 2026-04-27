import {
  getNetworkId,
  isMainnet,
  isTestnet,
  getStacksApiUrl,
  resetNetworkCache,
} from '../../src/config/network';

describe('config/network', () => {
  beforeEach(() => {
    resetNetworkCache();
    delete process.env.STACKS_NETWORK;
    delete process.env.STACKS_API_URL;
    process.env.NODE_ENV = 'test';
  });

  it('returns testnet by default in non-production', () => {
    expect(getNetworkId()).toBe('testnet');
  });

  it('throws in production when STACKS_NETWORK unset', () => {
    process.env.NODE_ENV = 'production';
    resetNetworkCache();
    expect(() => getNetworkId()).toThrow(/required in production/);
  });

  it('parses mainnet correctly', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getNetworkId()).toBe('mainnet');
    expect(isMainnet()).toBe(true);
    expect(isTestnet()).toBe(false);
  });

  it('rejects unknown network ids', () => {
    process.env.STACKS_NETWORK = 'wonderland';
    resetNetworkCache();
    expect(() => getNetworkId()).toThrow(/Invalid STACKS_NETWORK/);
  });

  it('derives Hiro mainnet API URL', () => {
    process.env.STACKS_NETWORK = 'mainnet';
    resetNetworkCache();
    expect(getStacksApiUrl()).toBe('https://api.mainnet.hiro.so');
  });

  it('derives Hiro testnet API URL', () => {
    expect(getStacksApiUrl()).toBe('https://api.testnet.hiro.so');
  });

  it('honors STACKS_API_URL override', () => {
    process.env.STACKS_API_URL = 'https://custom.example.com';
    resetNetworkCache();
    expect(getStacksApiUrl()).toBe('https://custom.example.com');
  });
});
