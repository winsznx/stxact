import { describe, it, expect } from 'vitest';
import { microStxToStx, stxToMicroStx, satToSbtc, sbtcToSat, formatPriceSbtc } from '../fees';

describe('fees', () => {
  it('microStxToStx converts bigint micro to STX', () => {
    expect(microStxToStx(1_000_000n)).toBe(1);
    expect(microStxToStx(1_500_000)).toBe(1.5);
  });

  it('stxToMicroStx converts STX to micro bigint', () => {
    expect(stxToMicroStx(1)).toBe(1_000_000n);
    expect(stxToMicroStx(0.001)).toBe(1_000n);
  });

  it('satToSbtc converts sats to sBTC float', () => {
    expect(satToSbtc(100_000_000n)).toBe(1);
    expect(satToSbtc(50_000_000)).toBe(0.5);
  });

  it('sbtcToSat converts sBTC to sats bigint', () => {
    expect(sbtcToSat(1)).toBe(100_000_000n);
  });

  it('formatPriceSbtc returns string with sBTC suffix', () => {
    expect(formatPriceSbtc(100_000_000n)).toContain('sBTC');
  });
});
