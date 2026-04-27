import { canonicalizeJson, hashServicePolicy } from '../../src/utils/policy-hash';

describe('policy-hash', () => {
  it('canonicalizes objects with sorted keys', () => {
    expect(canonicalizeJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('canonicalizes nested objects', () => {
    expect(canonicalizeJson({ a: { z: 1, b: 2 } })).toBe('{"a":{"b":2,"z":1}}');
  });

  it('canonicalizes arrays preserving order', () => {
    expect(canonicalizeJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('canonicalizes primitives', () => {
    expect(canonicalizeJson('a')).toBe('"a"');
    expect(canonicalizeJson(42)).toBe('42');
    expect(canonicalizeJson(null)).toBe('null');
    expect(canonicalizeJson(true)).toBe('true');
  });

  it('hash is stable across key ordering', () => {
    const a = hashServicePolicy({ x: 1, y: 2 });
    const b = hashServicePolicy({ y: 2, x: 1 });
    expect(a).toBe(b);
  });

  it('hash differs across content', () => {
    expect(hashServicePolicy({ a: 1 })).not.toBe(hashServicePolicy({ a: 2 }));
  });

  it('hash output is 64 hex chars', () => {
    expect(hashServicePolicy({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
