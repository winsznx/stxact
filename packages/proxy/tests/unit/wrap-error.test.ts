import { wrapError, unwrapErrorMessage, WrappedError } from '../../src/utils/wrap-error';

describe('wrap-error', () => {
  it('wraps with cause', () => {
    const inner = new Error('oops');
    const w = wrapError('outer', inner);
    expect(w).toBeInstanceOf(WrappedError);
    expect(w.message).toBe('outer');
    expect(w.cause).toBe(inner);
  });

  it('unwraps Error message', () => {
    expect(unwrapErrorMessage(new Error('bad'))).toBe('bad');
  });

  it('unwraps string', () => {
    expect(unwrapErrorMessage('oops')).toBe('oops');
  });

  it('JSON-encodes plain object', () => {
    expect(unwrapErrorMessage({ code: 1 })).toBe('{"code":1}');
  });

  it('falls back to String() for non-serializable', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const out = unwrapErrorMessage(cyclic);
    expect(typeof out).toBe('string');
  });
});
