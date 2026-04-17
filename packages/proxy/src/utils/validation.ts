export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isStacksPrincipal(value: string): boolean {
  return /^S[TP][0-9A-Z]{38,40}$/.test(value);
}

export function isHex64(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value);
}

export function clampPagination(limit: unknown, offset: unknown, maxLimit = 200): { limit: number; offset: number } {
  const parsedLimit = Math.min(Math.max(parseInt(String(limit || '50'), 10) || 50, 1), maxLimit);
  const parsedOffset = Math.max(parseInt(String(offset || '0'), 10) || 0, 0);
  return { limit: parsedLimit, offset: parsedOffset };
}
