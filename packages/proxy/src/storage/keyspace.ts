const SEP = ':';

export function buildCacheKey(...parts: ReadonlyArray<string | number>): string {
  return parts.map((p) => String(p)).join(SEP);
}

export function buildBnsCacheKey(name: string): string {
  return buildCacheKey('bns', name.toLowerCase());
}

export function buildReceiptCacheKey(receiptId: string): string {
  return buildCacheKey('receipt', receiptId);
}

export function buildReputationCacheKey(principal: string): string {
  return buildCacheKey('reputation', principal);
}
