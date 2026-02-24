import { Schema as S } from "effect";
import * as N from "./numeric";
import { Option } from "effect";
import type { Range } from "./range";

export type Span<A extends number> = {
  start: A;
  size: A;
};

export const make = <A extends number>(
  start: A,
  size: A,
): Span<A> => ({
  start,
  size,
});

export const center = <A extends number>(s: Span<A>): A =>
  N.add(s.start, N.divide(s.size, 2));

export const end = <A extends number>(s: Span<A>): A => N.add(s.start, s.size);

export const move = <A extends number>(s: Span<A>, delta: A): Span<A> => ({
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

export const overlaps = <A extends number>(a: Span<A>, b: Span<A>): boolean => {
  if (a.size === 0 || b.size === 0) return false;
  return N.lt(a.start, end(b)) && N.lt(b.start, end(a));
};

export const intersection = <A extends number>(
  a: Span<A>,
  b: Span<A>,
): Option.Option<Span<A>> => {
  const iStart = N.max(a.start, b.start);
  const iEnd = N.min(end(a), end(b));
  return N.lt(iStart, iEnd)
    ? Option.some({ start: iStart, size: N.subtract(iEnd, iStart) })
    : Option.none();
};

export const subtract = <A extends number>(a: Span<A>, b: Span<A>): Span<A>[] => {
  if (!overlaps(a, b)) return [a];
  const results: Span<A>[] = [];
  const aEnd = end(a);
  const bEnd = end(b);
  if (N.lt(a.start, b.start)) results.push({ start: a.start, size: N.subtract(b.start, a.start) });
  if (N.lt(bEnd, aEnd)) results.push({ start: bEnd, size: N.subtract(aEnd, bEnd) });
  return results;
};

export const Schema = <A, I, R>(inner: S.Schema<A, I, R>) =>
  S.Struct({
    start: inner,
    size: inner,
  });

export const toRange = <A extends number>(span: Span<A>): Range<A> => ({
  start: span.start,
  end: N.add(span.start, span.size),
});

export const fromRange = <A extends number>(range: Range<A>): Span<A> => ({
  start: range.start,
  size: N.subtract(range.end, range.start),
});
