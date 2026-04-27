import { describe, it, expect } from 'vitest';
import { buildConnectSrc, buildContentSecurityPolicy } from '../csp';

describe('csp', () => {
  it('mainnet connect-src includes only mainnet hiro', () => {
    const src = buildConnectSrc('mainnet');
    expect(src).toContain('api.mainnet.hiro.so');
    expect(src).not.toContain('api.testnet.hiro.so');
  });

  it('testnet connect-src includes only testnet hiro', () => {
    const src = buildConnectSrc('testnet');
    expect(src).toContain('api.testnet.hiro.so');
    expect(src).not.toContain('api.mainnet.hiro.so');
  });

  it('preserves walletconnect entries', () => {
    const src = buildConnectSrc('mainnet');
    expect(src).toContain('wss://*.walletconnect.com');
    expect(src).toContain('wss://*.walletconnect.org');
  });

  it('extra origins are merged into connect-src', () => {
    const src = buildConnectSrc('mainnet', ['https://api.example.com']);
    expect(src).toContain('https://api.example.com');
  });

  it('full CSP string contains expected directives', () => {
    const csp = buildContentSecurityPolicy('mainnet');
    expect(csp).toContain('default-src');
    expect(csp).toContain('connect-src');
    expect(csp).toContain('frame-ancestors');
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
