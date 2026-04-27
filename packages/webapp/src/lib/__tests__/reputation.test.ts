import { describe, it, expect } from 'vitest';
import { calculateSuccessRate, formatSuccessRatePercent, bandReputationScore } from '../reputation';

describe('reputation', () => {
  it('calculateSuccessRate returns zero with no deliveries', () => {
    expect(calculateSuccessRate(0, 0)).toBe(0);
  });

  it('calculateSuccessRate returns 1 when no disputes', () => {
    expect(calculateSuccessRate(10, 0)).toBe(1);
  });

  it('calculateSuccessRate excludes disputes from success', () => {
    expect(calculateSuccessRate(10, 2)).toBeCloseTo(0.8);
  });

  it('formatSuccessRatePercent renders one decimal', () => {
    expect(formatSuccessRatePercent(0.876)).toBe('87.6%');
  });

  it('formatSuccessRatePercent clamps overflow', () => {
    expect(formatSuccessRatePercent(1.5)).toBe('100.0%');
    expect(formatSuccessRatePercent(-0.2)).toBe('0.0%');
  });

  it('bandReputationScore classifies low', () => {
    expect(bandReputationScore(10)).toBe('low');
    expect(bandReputationScore(49)).toBe('low');
  });

  it('bandReputationScore classifies medium', () => {
    expect(bandReputationScore(50)).toBe('medium');
    expect(bandReputationScore(79)).toBe('medium');
  });

  it('bandReputationScore classifies high', () => {
    expect(bandReputationScore(80)).toBe('high');
    expect(bandReputationScore(100)).toBe('high');
  });
});
