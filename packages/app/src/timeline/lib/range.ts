// range.ts
import type { Numeric } from './numeric'

export type Range<A extends number> = {
	start: A
	end: A
}

export function make<A extends number>(
	N: Numeric<A>,
	start: number,
	end: number,
): Range<A> {
	return { start: N.make(start), end: N.make(end) }
}

export function length<A extends number>(N: Numeric<A>, r: Range<A>): A {
	return N.subtract(r.end, r.start)
}

export function map<A extends number, B extends number>(
	r: Range<A>,
	map: (t: A) => B,
): Range<B> {
	return { start: map(r.start), end: map(r.end) }
}

export function transformStart<A extends number>(
	r: Range<A>,
	map: (t: A) => A,
): Range<A> {
	return {
		...r,
		start: map(r.start),
	}
}

export function transformEnd<A extends number>(
	r: Range<A>,
	map: (t: A) => A,
): Range<A> {
	return {
		...r,
		end: map(r.end),
	}
}

export function move<A extends number>(
	N: Numeric<A>,
	r: Range<A>,
	delta: A,
): Range<A> {
	return {
		start: N.add(r.start, delta),
		end: N.add(r.end, delta),
	}
}

// clamp r to be a "window" inside bounds, preserving width
export function clampRangeTo<A extends number>(
	N: Numeric<A>,
	r: Range<A>,
	bounds: Range<A>,
): Range<A> {
	const w = length(N, r)
	const boundsW = length(N, bounds)

	if (N.max(w, boundsW) === w) return bounds

	const boundsEndMinusW = N.subtract(bounds.end, w)

	const start = N.clamp(r.start, bounds.start, boundsEndMinusW)
	const end = N.min(N.add(start, w), bounds.end)

	return { start, end }
}
