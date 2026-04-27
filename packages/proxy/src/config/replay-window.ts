const DEFAULT_REPLAY_WINDOW_SECONDS = 300;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export function getReplayWindowSeconds(): number {
  return parsePositiveInt(process.env.REPLAY_WINDOW_SECONDS) ?? DEFAULT_REPLAY_WINDOW_SECONDS;
}

export function getTimestampBucketSeconds(): number {
  return parsePositiveInt(process.env.TIMESTAMP_BUCKET_SECONDS) ?? DEFAULT_REPLAY_WINDOW_SECONDS;
}

export function bucketTimestamp(timestampMs: number): number {
  const bucketSize = getTimestampBucketSeconds() * 1000;
  return Math.floor(timestampMs / bucketSize) * bucketSize;
}

export function isWithinReplayWindow(requestTimestampMs: number, nowMs: number): boolean {
  const windowMs = getReplayWindowSeconds() * 1000;
  return Math.abs(nowMs - requestTimestampMs) <= windowMs;
}
