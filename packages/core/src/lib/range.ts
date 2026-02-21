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

export const map = <A extends number, B extends number>(r: Range<A>, f: (a: A) => B): Range<B> => ({
  start: f(r.start),
  end: f(r.end),
});

export const width = <A extends number>(N: Numeric<A>, range: Range<A>): A =>
  N.subtract(range.end, range.start);

export const clamp = <A extends number>(N: Numeric<A>, inner: Range<A>, outer: Range<A>): Range<A> => ({
  start: N.clamp(inner.start, outer.start, outer.end),
  end: N.clamp(inner.end, outer.start, outer.end),
});
