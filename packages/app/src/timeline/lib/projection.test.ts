import { describe, expect, it } from 'vitest'
import * as Projection from './projection'
import * as Px from './px'
import * as Range from './range'

describe('timeline/lib/projection', () => {
	it('scaleFor maps view width to viewport width', () => {
		const view = Range.make(Px.Numeric, 10, 20) // width 10
		const size = Range.length(Px.Numeric, view)
		const scale = Projection.scaleFor(Px.Numeric, size, Px.Px(100)) // => 10px/unit
		expect(scale).toBe(10)
	})

	it('toScreen/fromScreen are inverses (for same scale/from)', () => {
		const from = Px.Px(10)
		const scale = 2
		const at = Px.Px(17)

		const px = Projection.toScreen(Px.Numeric, from, at, scale)
		expect(px).toBe(Px.Px(14))

		const roundTrip = Projection.fromScreen(Px.Numeric, from, px, scale)
		expect(roundTrip).toBe(at)
	})
})
