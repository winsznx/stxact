export function stripHexPrefix(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

export function ensureHexPrefix(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

export function isHexString(value: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(value) || /^[0-9a-fA-F]+$/.test(value);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const stripped = stripHexPrefix(hex);
  if (stripped.length % 2 !== 0) throw new Error('hex string must have even length');
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
