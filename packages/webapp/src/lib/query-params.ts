type Primitive = string | number | boolean | undefined | null;

export function buildSearchParams(params: Record<string, Primitive>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean' && !value) continue;
    sp.set(key, String(value));
  }
  return sp.toString();
}

export function appendSearchParams(url: string, params: Record<string, Primitive>): string {
  const query = buildSearchParams(params);
  if (!query) return url;
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}
