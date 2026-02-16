/**
 * Recursive JSON Canonicalization
 *
 * Recursively sorts all object keys at all nesting levels to ensure
 * deterministic JSON serialization for hashing and signing.
 *
 * PRD Reference: Section 10 - Delivery Proofs
 */

export function canonicalize(obj: unknown): unknown {
  // Handle arrays: recursively canonicalize each element
  if (Array.isArray(obj)) {
    return obj.map((element) => canonicalize(element));
  }

  // Handle objects: sort keys and recursively canonicalize values
  if (obj !== null && typeof obj === 'object') {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sortedObj[key] = canonicalize((obj as Record<string, unknown>)[key]);
    }

    return sortedObj;
  }

  // Primitives (string, number, boolean, null): return as-is
  return obj;
}

/**
 * Example usage:
 *
 * const input = { z: 1, a: { c: 3, b: 2 }, m: [{ y: 1, x: 2 }] };
 * const canonical = canonicalize(input);
 * // Result: { a: { b: 2, c: 3 }, m: [{ x: 2, y: 1 }], z: 1 }
 *
 * const json = JSON.stringify(canonical);
 * // Deterministic output: {"a":{"b":2,"c":3},"m":[{"x":2,"y":1}],"z":1}
 */
