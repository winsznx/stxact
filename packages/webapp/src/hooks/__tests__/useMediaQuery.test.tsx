import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery, useIsMobile } from '../useMediaQuery';

describe('useMediaQuery', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('returns true when media query matches', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when media query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 9999px)'));
    expect(result.current).toBe(false);
  });

  it('useIsMobile reflects mobile breakpoint', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
