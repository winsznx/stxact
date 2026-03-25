function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalize(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

async function sha256Hex(payload: Uint8Array): Promise<string> {
  const normalized = new Uint8Array(payload.byteLength);
  normalized.set(payload);
  const digest = await crypto.subtle.digest('SHA-256', normalized.buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeBinaryHash(payload: Uint8Array): Promise<string> {
  return sha256Hex(payload);
}

export async function computeDeliverableHash(value: unknown): Promise<string> {
  const canonicalJson = JSON.stringify(canonicalize(value));
  return sha256Hex(new TextEncoder().encode(canonicalJson));
}

/**
 * Executes logic associated with compute deliverable hash from text.
 */
export async function computeDeliverableHashFromText(input: string): Promise<string> {
  try {
    return await computeDeliverableHash(JSON.parse(input));
  } catch {
    return sha256Hex(new TextEncoder().encode(input));
  }
}
