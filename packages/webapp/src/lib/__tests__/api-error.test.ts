import { describe, it, expect } from 'vitest';
import { isApiError, getErrorMessage, isNotFoundError } from '../api-error';
import { APIError } from '../api';

describe('isApiError', () => {
  it('identifies APIError instances', () => {
    expect(isApiError(new APIError('fail', 400))).toBe(true);
  });

  it('rejects plain Error instances', () => {
    expect(isApiError(new Error('fail'))).toBe(false);
  });

  it('rejects non-error values', () => {
    expect(isApiError('string')).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from APIError', () => {
    expect(getErrorMessage(new APIError('bad input', 400))).toBe('bad input');
  });

  it('extracts message from regular Error', () => {
    expect(getErrorMessage(new Error('oops'))).toBe('oops');
  });

  it('returns fallback for unknown types', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });
});

describe('isNotFoundError', () => {
  it('returns true for 404 APIError', () => {
    expect(isNotFoundError(new APIError('not found', 404))).toBe(true);
  });

  it('returns false for other status codes', () => {
    expect(isNotFoundError(new APIError('bad', 400))).toBe(false);
  });
});
