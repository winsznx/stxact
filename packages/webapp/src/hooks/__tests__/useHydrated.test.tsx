import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHydrated } from '../useHydrated';

describe('useHydrated', () => {
  it('returns true after mount in jsdom', () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
  });
});
