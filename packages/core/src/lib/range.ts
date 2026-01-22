import type { Numeric } from "./numeric";

export type Range<A extends number> = {
	start: A;
	end: A;
};

export const make = <A extends number>(
	N: Numeric<A>,
	start: number,
	end: number,
): Range<A> => ({ start: N.make(start), end: N.make(end) });

export const length = <A extends number>(N: Numeric<A>, r: Range<A>): A =>
	N.subtract(r.end, r.start);

export const map = <A extends number, B extends number>(
	r: Range<A>,
	f: (t: A) => B,
): Range<B> => ({ start: f(r.start), end: f(r.end) });

export const transformStart = <A extends number>(
	r: Range<A>,
	f: (t: A) => A,
): Range<A> => ({
	...r,
	start: f(r.start),
});

export const transformEnd = <A extends number>(
	r: Range<A>,
	f: (t: A) => A,
): Range<A> => ({
	...r,
	end: f(r.end),
});

export const move = <A extends number>(
	N: Numeric<A>,
	r: Range<A>,
	delta: A,
): Range<A> => ({
	start: N.add(r.start, delta),
	end: N.add(r.end, delta),
});

export const clampTo = <A extends number>(
	N: Numeric<A>,
	r: Range<A>,
	bounds: Range<A>,
): Range<A> => {
	const w = length(N, r);
	const boundsW = length(N, bounds);
	if (N.max(w, boundsW) === w) return bounds;
	const boundsEndMinusW = N.subtract(bounds.end, w);
	const start = N.clamp(r.start, bounds.start, boundsEndMinusW);
	const end = N.min(N.add(start, w), bounds.end);
	return { start, end };
};
