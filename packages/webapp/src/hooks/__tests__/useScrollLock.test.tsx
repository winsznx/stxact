import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollLock } from '../useScrollLock';

describe('useScrollLock', () => {
  it('locks body overflow when active', () => {
    document.body.style.overflow = '';
    renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('does not lock body when inactive', () => {
    document.body.style.overflow = '';
    renderHook(() => useScrollLock(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('restores body overflow on unmount', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
