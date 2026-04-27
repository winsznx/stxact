import { createHash } from 'crypto';

export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

export function hashServicePolicy(policy: unknown): string {
  const canonical = canonicalizeJson(policy);
  return createHash('sha256').update(canonical).digest('hex');
}
