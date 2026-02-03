import { ulid } from "ulid";

/**
 * Generates a unique ID with an optional prefix.
 *
 * Uses ULID (Universally Unique Lexicographically Sortable Identifier)
 * which provides:
 * - 128-bit compatibility with UUID
 * - Lexicographically sortable
 * - Canonically encoded as a 26 character string
 * - Uses Crockford's base32 for better efficiency and readability
 *
 * @param prefix - Optional prefix to prepend to the ID
 * @returns A unique identifier string
 *
 * @example
 * ```ts
 * generateId() // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * generateId("field") // "field-01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * ```
 */
export function generateId(prefix?: string): string {
  const id = ulid();
  return prefix ? `${prefix}-${id}` : id;
}
