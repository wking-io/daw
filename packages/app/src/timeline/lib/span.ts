import type { Numeric } from "./numeric";
import * as Range from "./range";

export type Span<A extends number> = {
	start: A;
	size: A;
};

export function make<A extends number>(
	N: Numeric<A>,
	start: number,
	size: number,
): Span<A> {
	return { start: N.make(start), size: N.make(size) };
}

export function center<A extends number>(N: Numeric<A>, s: Span<A>): A {
	return N.add(s.start, N.divide(s.size, 2));
}

export function end<A extends number>(N: Numeric<A>, s: Span<A>): A {
	return N.add(s.start, s.size);
}

export function move<A extends number>(
	N: Numeric<A>,
	s: Span<A>,
	delta: A,
): Span<A> {
	return { start: N.add(s.start, delta), size: s.size };
}

export function transform<A extends number>(
	s: Span<A>,
	f: (a: A) => A,
): Span<A> {
	return { start: f(s.start), size: f(s.size) };
}

export function map<A extends number, B extends number>(
	s: Span<A>,
	f: (a: A) => B,
): Span<B> {
	return { start: f(s.start), size: f(s.size) };
}

export function withStart<A extends number>(s: Span<A>, start: A): Span<A> {
	return { ...s, start };
}

export function withSize<A extends number>(s: Span<A>, size: A): Span<A> {
	return { ...s, size };
}

export function toRange<A extends number>(N: Numeric<A>, s: Span<A>) {
	return Range.make(N, s.start, end(N, s));
}
