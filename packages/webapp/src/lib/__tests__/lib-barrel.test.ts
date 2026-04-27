import { describe, it, expect } from 'vitest';
import * as lib from '../index';

describe('lib barrel', () => {
  it('re-exports cn', () => {
    expect(typeof lib.cn).toBe('function');
  });

  it('re-exports network helpers', () => {
    expect(typeof lib.getNetwork).toBe('function');
    expect(typeof lib.isMainnet).toBe('function');
  });

  it('re-exports stacks helpers', () => {
    expect(typeof lib.getTransactionUrl).toBe('function');
    expect(typeof lib.getAddressUrl).toBe('function');
  });

  it('re-exports token contracts', () => {
    expect(typeof lib.getSbtcContractId).toBe('function');
  });

  it('re-exports CSP builder', () => {
    expect(typeof lib.buildContentSecurityPolicy).toBe('function');
  });
});
