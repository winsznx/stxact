import { describe, it, expect } from 'vitest';
import { buildConnectSrc } from '../csp';

describe('CSP duplicate suppression', () => {
  it('does not duplicate Hiro mainnet origin when included in extras', () => {
    const out = buildConnectSrc('mainnet', ['https://api.mainnet.hiro.so']);
    expect(out.match(/api\.mainnet\.hiro\.so/g)?.length).toBe(1);
  });

  it('preserves order across extras', () => {
    const out = buildConnectSrc('testnet', ['https://a.example.com', 'https://b.example.com']);
    expect(out).toContain('a.example.com');
    expect(out).toContain('b.example.com');
  });
});
