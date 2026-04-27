import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('joins simple class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('merges conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('preserves non-conflicting classes', () => {
    expect(cn('text-sm', 'font-bold')).toContain('text-sm');
    expect(cn('text-sm', 'font-bold')).toContain('font-bold');
  });
});
