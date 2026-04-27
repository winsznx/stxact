export function shortReceiptId(id: string, prefixLen = 8, suffixLen = 4): string {
  if (id.length <= prefixLen + suffixLen) return id;
  return `${id.slice(0, prefixLen)}…${id.slice(-suffixLen)}`;
}

export function isValidReceiptId(id: string): boolean {
  return /^[A-Za-z0-9_-]{16,128}$/.test(id);
}
