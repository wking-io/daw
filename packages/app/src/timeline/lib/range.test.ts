import { describe, expect, it } from 'vitest'
import type { Numeric } from './numeric'
import * as Range from './range'

const NumberNumeric: Numeric<number> = {
	make: (n) => n,
	add: (a, b) => a + b,
	subtract: (a, b) => a - b,
	multiply: (a, b) => a * b,
	divide: (a, b) => a / b,
	min: (a, b) => Math.min(a, b),
	max: (a, b) => Math.max(a, b),
	clamp: (x, low, high) => Math.min(Math.max(x, low), high),
}

describe('timeline/lib/range', () => {
	it('make uses Numeric.make for start/end', () => {
		const N: Numeric<number> = {
			...NumberNumeric,
			make: (n) => n * 2,
		}

		expect(Range.make(N, 1, 2)).toEqual({ start: 2, end: 4 })
	})

	it('length', () => {
		expect(Range.length(NumberNumeric, { start: 10, end: 25 })).toBe(15)
	})

	it('transformStart/transformEnd', () => {
		const r = { start: 1, end: 5 }
		expect(Range.transformStart(r, (s) => s + 2)).toEqual({ start: 3, end: 5 })
		expect(Range.transformEnd(r, (e) => e + 2)).toEqual({ start: 1, end: 7 })
	})

	it('move shifts both endpoints by delta', () => {
		expect(Range.move(NumberNumeric, { start: 1, end: 5 }, 2)).toEqual({
			start: 3,
			end: 7,
		})
	})

	describe('clampRangeTo', () => {
		it('preserves width while clamping to bounds', () => {
			const bounds = { start: 0, end: 100 }
			const r = { start: 10, end: 30 } // width 20
			expect(Range.clampRangeTo(NumberNumeric, r, bounds)).toEqual(r)
		})

		it('clamps when range starts before bounds', () => {
			const bounds = { start: 0, end: 100 }
			const r = { start: -10, end: 10 } // width 20
			expect(Range.clampRangeTo(NumberNumeric, r, bounds)).toEqual({ start: 0, end: 20 })
		})

		it('clamps when range starts after boundsEndMinusWidth', () => {
			const bounds = { start: 0, end: 100 }
			const r = { start: 95, end: 115 } // width 20, latest start is 80
			expect(Range.clampRangeTo(NumberNumeric, r, bounds)).toEqual({ start: 80, end: 100 })
		})

		it('handles width equal to bounds width', () => {
			const bounds = { start: 0, end: 100 }
			const r = { start: -50, end: 50 } // width 100
			expect(Range.clampRangeTo(NumberNumeric, r, bounds)).toEqual({ start: 0, end: 100 })
		})

		it('handles width larger than bounds width by returning bounds', () => {
			const bounds = { start: 0, end: 100 }
			const r = { start: -10, end: 150 } // width 160 > 100
			expect(Range.clampRangeTo(NumberNumeric, r, bounds)).toEqual(bounds)
		})
	})
})


