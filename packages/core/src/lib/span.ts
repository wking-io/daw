import { Schema as S } from "effect";
import type { Numeric } from "./numeric";

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

export const Schema = <A, I, R>(inner: S.Schema<A, I, R>) =>
  S.Struct({
    start: inner,
    size: inner,
  });
