import { nowSeconds, isoFromSeconds, secondsFromIso, elapsedSeconds, SECOND_MS, MINUTE_MS } from '../../src/utils/time';

describe('time utils', () => {
  it('SECOND_MS is 1000', () => {
    expect(SECOND_MS).toBe(1000);
  });

  it('MINUTE_MS is 60_000', () => {
    expect(MINUTE_MS).toBe(60_000);
  });

  it('nowSeconds returns current epoch in seconds', () => {
    const before = Math.floor(Date.now() / 1000);
    const s = nowSeconds();
    const after = Math.floor(Date.now() / 1000);
    expect(s).toBeGreaterThanOrEqual(before);
    expect(s).toBeLessThanOrEqual(after);
  });

  it('isoFromSeconds and secondsFromIso roundtrip', () => {
    const s = 1700000000;
    expect(secondsFromIso(isoFromSeconds(s))).toBe(s);
  });

  it('elapsedSeconds counts seconds since reference', () => {
    const past = Date.now() - 5_000;
    expect(elapsedSeconds(past)).toBeGreaterThanOrEqual(4);
  });
});
