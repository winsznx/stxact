import { describe, it, expect } from 'vitest';
import { buildSearchParams, appendSearchParams } from '../query-params';

describe('query-params', () => {
  it('drops undefined and null', () => {
    expect(buildSearchParams({ a: 'x', b: undefined, c: null })).toBe('a=x');
  });

  it('drops boolean false', () => {
    expect(buildSearchParams({ on: false, off: true })).toBe('off=true');
  });

  it('coerces numbers to strings', () => {
    expect(buildSearchParams({ n: 42 })).toBe('n=42');
  });

  it('appends to URL without existing query', () => {
    expect(appendSearchParams('/api', { a: 1 })).toBe('/api?a=1');
  });

  it('appends to URL with existing query', () => {
    expect(appendSearchParams('/api?x=y', { a: 1 })).toBe('/api?x=y&a=1');
  });

  it('returns URL unchanged when no params', () => {
    expect(appendSearchParams('/api', {})).toBe('/api');
  });
});
