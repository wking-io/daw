type Falsy = false | null | undefined | 0 | "" | 0n;

export function cn(...classes: Array<string | Falsy>): string {
  return classes.reduce<string>((acc, s) => (s ? `${acc} ${s}` : acc), "").trim();
}
