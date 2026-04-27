export interface RetryOptions {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULTS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  attempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5_000,
  factor: 2,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const cfg = { ...DEFAULTS, ...options };
  let lastError: unknown;
  let waitMs = cfg.initialDelayMs;

  for (let attempt = 1; attempt <= cfg.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (cfg.shouldRetry && !cfg.shouldRetry(error)) throw error;
      if (attempt === cfg.attempts) break;
      await delay(waitMs);
      waitMs = Math.min(waitMs * cfg.factor, cfg.maxDelayMs);
    }
  }
  throw lastError;
}
