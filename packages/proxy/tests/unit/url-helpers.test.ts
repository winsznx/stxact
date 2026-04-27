import { isAbsoluteUrl, joinUrl, urlOriginOf, isLoopbackHost } from '../../src/utils/url-helpers';

describe('url-helpers', () => {
  it('isAbsoluteUrl detects http(s) URLs', () => {
    expect(isAbsoluteUrl('http://x.com')).toBe(true);
    expect(isAbsoluteUrl('https://x.com')).toBe(true);
    expect(isAbsoluteUrl('/path')).toBe(false);
  });

  it('joinUrl avoids double slashes', () => {
    expect(joinUrl('http://x.com/', '/y')).toBe('http://x.com/y');
    expect(joinUrl('http://x.com', 'y')).toBe('http://x.com/y');
  });

  it('urlOriginOf returns origin or null', () => {
    expect(urlOriginOf('https://x.com/path')).toBe('https://x.com');
    expect(urlOriginOf('not a url')).toBeNull();
  });

  it('isLoopbackHost matches loopbacks', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('example.com')).toBe(false);
  });
});
