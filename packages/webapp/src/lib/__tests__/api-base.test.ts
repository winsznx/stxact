import { describe, it, expect, beforeEach } from 'vitest';
import { getApiBaseUrl } from '../api-base';

describe('api-base', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('falls back to localhost when env unset', () => {
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:3001');
  });

  it('uses NEXT_PUBLIC_API_URL when set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('honors empty string by falling back to default', () => {
    process.env.NEXT_PUBLIC_API_URL = '';
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:3001');
  });
});
