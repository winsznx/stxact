import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 100));
    expect(result.current).toBe('a');
  });

  it('debounces subsequent updates', async () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 50), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 75));
    });
    expect(result.current).toBe('b');
  });
});
