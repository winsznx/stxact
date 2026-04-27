import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurrentEpochSeconds } from '../useCurrentEpochSeconds';

describe('useCurrentEpochSeconds', () => {
  it('returns a current epoch in seconds', () => {
    const { result } = renderHook(() => useCurrentEpochSeconds());
    const now = Math.floor(Date.now() / 1000);
    expect(result.current).toBeGreaterThanOrEqual(now - 1);
    expect(result.current).toBeLessThanOrEqual(now + 1);
  });
});
