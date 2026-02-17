import type { Numeric } from "./numeric";

export type Range<A extends number> = {
  start: A;
  end: A;
};

export const make = <A extends number>(N: Numeric<A>, start: number, end: number): Range<A> => ({
  start: N.make(start),
  end: N.make(end),
});

export const eq = <A extends number>(N: Numeric<A>, a: Range<A>, b: Range<A>): boolean => {
  return N.eq(a.start, b.start) && N.eq(a.end, b.end);
};
