export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export function nowSeconds(): number {
  return Math.floor(Date.now() / SECOND_MS);
}

export function isoFromSeconds(seconds: number): string {
  return new Date(seconds * SECOND_MS).toISOString();
}

export function secondsFromIso(iso: string): number {
  return Math.floor(Date.parse(iso) / SECOND_MS);
}

export function elapsedSeconds(sinceMs: number): number {
  return Math.floor((Date.now() - sinceMs) / SECOND_MS);
}
