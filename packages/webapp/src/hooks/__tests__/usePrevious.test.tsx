import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePrevious } from '../usePrevious';

describe('usePrevious', () => {
  it('returns undefined on first render', () => {
    const { result } = renderHook(() => usePrevious('initial'));
    expect(result.current).toBeUndefined();
  });

  it('returns previous value across renders', () => {
    const { result, rerender } = renderHook(({ v }) => usePrevious(v), {
      initialProps: { v: 1 },
    });
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 3 });
    expect(result.current).toBe(2);
  });

  it('handles object values', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const { result, rerender } = renderHook(({ v }) => usePrevious(v), { initialProps: { v: a } });
    rerender({ v: b });
    expect(result.current).toBe(a);
  });
});
