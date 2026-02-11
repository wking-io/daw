import * as Projection from '@daw/core/lib/projection'
import * as Px from '@daw/core/lib/px'

export function deltaFrom({
	x,
	scale,
	offset,
	from,
}: {
	x: Px.Px
	offset: Px.Px
	scale: number
	from?: Px.Px
}): Px.Px {
	const N = Px.Numeric
	const at = Projection.fromScreen(N, N.zero, x, scale)
	const nextStart = N.subtract(at, offset)
	return N.subtract(nextStart, from ?? N.zero)
}

export function zoomFactorFromDelta(dy: number, rate = 350): number {
	return Math.pow(2, -dy / rate)
}
