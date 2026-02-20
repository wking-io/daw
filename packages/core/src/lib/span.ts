import { Schema as S } from "effect";
import type { Numeric } from "./numeric";
import { Option } from "effect";

export type Span<A extends number> = {
  start: A;
  size: A;
};

export const make = <A extends number>(N: Numeric<A>, start: number, size: number): Span<A> => ({
  start: N.make(start),
  size: N.make(size),
});

export const center = <A extends number>(N: Numeric<A>, s: Span<A>): A =>
  N.add(s.start, N.divide(s.size, 2));

export const end = <A extends number>(N: Numeric<A>, s: Span<A>): A => N.add(s.start, s.size);

export const move = <A extends number>(N: Numeric<A>, s: Span<A>, delta: A): Span<A> => ({
  start: N.add(s.start, delta),
  size: s.size,
});

export const transform = <A extends number>(s: Span<A>, f: (a: A) => A): Span<A> => ({
  start: f(s.start),
  size: f(s.size),
});

export const map = <A extends number, B extends number>(s: Span<A>, f: (a: A) => B): Span<B> => ({
  start: f(s.start),
  size: f(s.size),
});

export const withStart = <A extends number>(s: Span<A>, start: A): Span<A> => ({
  ...s,
  start,
});

export const withSize = <A extends number>(s: Span<A>, size: A): Span<A> => ({
  ...s,
  size,
});

export const overlaps = <A extends number>(N: Numeric<A>, a: Span<A>, b: Span<A>): boolean => {
  if (N.eq(a.size, N.zero) || N.eq(b.size, N.zero)) return false;
  return N.lt(a.start, end(N, b)) && N.lt(b.start, end(N, a));
};

export const intersection = <A extends number>(
  N: Numeric<A>,
  a: Span<A>,
  b: Span<A>,
): Option.Option<Span<A>> => {
  const iStart = N.max(a.start, b.start);
  const iEnd = N.min(end(N, a), end(N, b));
  return N.lt(iStart, iEnd)
    ? Option.some({ start: iStart, size: N.subtract(iEnd, iStart) })
    : Option.none();
};

export const subtract = <A extends number>(N: Numeric<A>, a: Span<A>, b: Span<A>): Span<A>[] => {
  if (!overlaps(N, a, b)) return [a];
  const results: Span<A>[] = [];
  const aEnd = end(N, a);
  const bEnd = end(N, b);
  if (N.lt(a.start, b.start)) results.push({ start: a.start, size: N.subtract(b.start, a.start) });
  if (N.lt(bEnd, aEnd)) results.push({ start: bEnd, size: N.subtract(aEnd, bEnd) });
  return results;
};

export const Schema = <A, I, R>(inner: S.Schema<A, I, R>) =>
  S.Struct({
    start: inner,
    size: inner,
  });
