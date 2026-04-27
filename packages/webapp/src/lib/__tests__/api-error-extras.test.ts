import { describe, it, expect } from 'vitest';
import { isApiError, getErrorMessage, isNotFoundError, isUnauthorizedError } from '../api-error';
import { APIError } from '../api';

describe('api-error extras', () => {
  it('isApiError detects APIError class', () => {
    const err = new APIError('not found', 404);
    expect(isApiError(err)).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
  });

  it('getErrorMessage extracts from APIError', () => {
    const err = new APIError('boom', 500);
    expect(getErrorMessage(err)).toBe('boom');
  });

  it('getErrorMessage extracts from Error', () => {
    expect(getErrorMessage(new Error('oops'))).toBe('oops');
  });

  it('getErrorMessage falls back for unknown', () => {
    expect(getErrorMessage(undefined)).toContain('unexpected');
  });

  it('isNotFoundError detects 404', () => {
    expect(isNotFoundError(new APIError('x', 404))).toBe(true);
    expect(isNotFoundError(new APIError('x', 500))).toBe(false);
  });

  it('isUnauthorizedError detects 401', () => {
    expect(isUnauthorizedError(new APIError('x', 401))).toBe(true);
    expect(isUnauthorizedError(new APIError('x', 403))).toBe(false);
  });
});
