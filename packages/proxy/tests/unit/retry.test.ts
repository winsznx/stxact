import { retry } from '../../src/utils/retry';

describe('retry', () => {
  it('returns immediately when fn succeeds', async () => {
    const result = await retry(async () => 42);
    expect(result).toBe(42);
  });

  it('retries up to N attempts on failure', async () => {
    let count = 0;
    const result = await retry(
      async () => {
        count += 1;
        if (count < 3) throw new Error('fail');
        return 'done';
      },
      { initialDelayMs: 1, maxDelayMs: 1, attempts: 3 }
    );
    expect(result).toBe('done');
    expect(count).toBe(3);
  });

  it('throws after exhausting attempts', async () => {
    await expect(
      retry(async () => { throw new Error('always'); }, { initialDelayMs: 1, attempts: 2 })
    ).rejects.toThrow('always');
  });

  it('respects shouldRetry predicate', async () => {
    let count = 0;
    await expect(
      retry(
        async () => {
          count += 1;
          throw new Error('boom');
        },
        { attempts: 5, initialDelayMs: 1, shouldRetry: () => false }
      )
    ).rejects.toThrow('boom');
    expect(count).toBe(1);
  });
});
