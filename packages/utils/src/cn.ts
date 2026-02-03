type Falsy = false | null | undefined | 0 | "" | 0n;

/**
 * Concatenates class names, filtering out falsy values.
 * @param classes - Array of class names or falsy values
 * @returns A single space-separated string of class names
 *
 * @example
 * ```ts
 * cn("foo", false && "bar", "baz") // => "foo baz"
 * ```
 */
export function cn(...classes: Array<string | Falsy>): string {
  return classes.reduce<string>((acc, s) => (s ? `${acc} ${s}` : acc), "").trim();
}
