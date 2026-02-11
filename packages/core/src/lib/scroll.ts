// src/lib/timeline/projection-scroll.ts
import type { Numeric } from './numeric'
import * as Projection from './projection'
import type * as Px from './px'

export function width<A extends number>(
	N: Numeric<A>,
	size: A,
	scale: number,
): Px.Px {
	return Projection.toScreen(N, N.zero, size, scale)
}

export function toScroll<A extends number>(
	N: Numeric<A>,
	start: A,
	scale: number,
): Px.Px {
	return Projection.toScreen(N, N.zero, start, scale)
}

export function fromScroll<A extends number>(
	N: Numeric<A>,
	scroll: Px.Px,
	scale: number,
): A {
	return Projection.fromScreen(N, N.zero, scroll, scale)
}
