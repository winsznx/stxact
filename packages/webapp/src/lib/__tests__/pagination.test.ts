import { describe, it, expect } from 'vitest';
import {
  nextPage,
  previousPage,
  pageNumber,
  totalPages,
  defaultPageState,
} from '../pagination';

describe('pagination', () => {
  it('nextPage advances offset by limit', () => {
    expect(nextPage({ limit: 20, offset: 0 })).toEqual({ limit: 20, offset: 20 });
  });

  it('previousPage retreats but never below zero', () => {
    expect(previousPage({ limit: 20, offset: 10 })).toEqual({ limit: 20, offset: 0 });
    expect(previousPage({ limit: 20, offset: 0 })).toEqual({ limit: 20, offset: 0 });
  });

  it('pageNumber computes 1-indexed page', () => {
    expect(pageNumber({ limit: 20, offset: 0 })).toBe(1);
    expect(pageNumber({ limit: 20, offset: 40 })).toBe(3);
  });

  it('totalPages handles ceil', () => {
    expect(totalPages(100, 20)).toBe(5);
    expect(totalPages(101, 20)).toBe(6);
  });

  it('totalPages returns 1 minimum for non-zero', () => {
    expect(totalPages(0, 20)).toBe(1);
  });

  it('totalPages with zero limit returns 0', () => {
    expect(totalPages(100, 0)).toBe(0);
  });

  it('defaultPageState matches PAGINATION_DEFAULTS', () => {
    expect(defaultPageState().offset).toBe(0);
    expect(defaultPageState().limit).toBeGreaterThan(0);
  });
});
