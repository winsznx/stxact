import {
  getReplayWindowSeconds,
  getTimestampBucketSeconds,
  bucketTimestamp,
  isWithinReplayWindow,
} from '../../src/config/replay-window';

describe('replay-window', () => {
  beforeEach(() => {
    delete process.env.REPLAY_WINDOW_SECONDS;
    delete process.env.TIMESTAMP_BUCKET_SECONDS;
  });

  it('defaults to 300 seconds', () => {
    expect(getReplayWindowSeconds()).toBe(300);
    expect(getTimestampBucketSeconds()).toBe(300);
  });

  it('honors REPLAY_WINDOW_SECONDS override', () => {
    process.env.REPLAY_WINDOW_SECONDS = '600';
    expect(getReplayWindowSeconds()).toBe(600);
  });

  it('rejects non-positive replay window override', () => {
    process.env.REPLAY_WINDOW_SECONDS = '0';
    expect(getReplayWindowSeconds()).toBe(300);
  });

  it('buckets timestamp to nearest bucket boundary', () => {
    const ms = 1700000000000;
    const bucket = bucketTimestamp(ms);
    expect(bucket % (300 * 1000)).toBe(0);
    expect(ms - bucket).toBeGreaterThanOrEqual(0);
    expect(ms - bucket).toBeLessThan(300 * 1000);
  });

  it('two timestamps in same bucket return same bucketed value', () => {
    const a = 1700000000000;
    const b = a + 100 * 1000;
    expect(bucketTimestamp(a)).toBe(bucketTimestamp(b));
  });

  it('isWithinReplayWindow accepts requests inside window', () => {
    const now = 1700000000000;
    expect(isWithinReplayWindow(now - 60_000, now)).toBe(true);
  });

  it('isWithinReplayWindow rejects requests outside window', () => {
    const now = 1700000000000;
    expect(isWithinReplayWindow(now - 10 * 60_000, now)).toBe(false);
  });
});
