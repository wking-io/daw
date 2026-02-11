import { describe, expect, it } from 'vitest'
import {
	point,
	rect,
	stroke,
	textStyle,
	pointInRect,
	nodeBounds,
} from './types'
import type { SceneNode } from './types'

describe('timeline/scene/types', () => {
	describe('point', () => {
		it('creates a point with x and y coordinates', () => {
			expect(point(10, 20)).toEqual({ x: 10, y: 20 })
		})

		it('handles zero values', () => {
			expect(point(0, 0)).toEqual({ x: 0, y: 0 })
		})

		it('handles negative values', () => {
			expect(point(-5, -10)).toEqual({ x: -5, y: -10 })
		})

		it('handles decimal values', () => {
			expect(point(1.5, 2.7)).toEqual({ x: 1.5, y: 2.7 })
		})
	})

	describe('rect', () => {
		it('creates a rect with position and dimensions', () => {
			expect(rect(10, 20, 100, 50)).toEqual({
				x: 10,
				y: 20,
				width: 100,
				height: 50,
			})
		})

		it('handles zero dimensions', () => {
			expect(rect(0, 0, 0, 0)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
		})

		it('handles negative position', () => {
			expect(rect(-10, -20, 100, 50)).toEqual({
				x: -10,
				y: -20,
				width: 100,
				height: 50,
			})
		})
	})

	describe('stroke', () => {
		it('creates a stroke with color and width', () => {
			expect(stroke('red', 2)).toEqual({ color: 'red', width: 2 })
		})

		it('handles rgba colors', () => {
			expect(stroke('rgba(255, 0, 0, 0.5)', 1)).toEqual({
				color: 'rgba(255, 0, 0, 0.5)',
				width: 1,
			})
		})

		it('handles decimal widths', () => {
			expect(stroke('#000', 0.5)).toEqual({ color: '#000', width: 0.5 })
		})
	})

	describe('textStyle', () => {
		it('creates a text style with font and color', () => {
			expect(textStyle('12px Arial', 'black')).toEqual({
				font: '12px Arial',
				color: 'black',
				align: undefined,
				baseline: undefined,
			})
		})

		it('includes optional align', () => {
			expect(textStyle('12px Arial', 'black', 'center')).toEqual({
				font: '12px Arial',
				color: 'black',
				align: 'center',
				baseline: undefined,
			})
		})

		it('includes optional baseline', () => {
			expect(textStyle('12px Arial', 'black', 'left', 'top')).toEqual({
				font: '12px Arial',
				color: 'black',
				align: 'left',
				baseline: 'top',
			})
		})

		it('handles all align values', () => {
			const aligns: CanvasTextAlign[] = [
				'start',
				'end',
				'left',
				'right',
				'center',
			]
			for (const align of aligns) {
				expect(textStyle('12px Arial', 'black', align).align).toBe(align)
			}
		})

		it('handles all baseline values', () => {
			const baselines: CanvasTextBaseline[] = [
				'top',
				'hanging',
				'middle',
				'alphabetic',
				'ideographic',
				'bottom',
			]
			for (const baseline of baselines) {
				expect(
					textStyle('12px Arial', 'black', undefined, baseline).baseline,
				).toBe(baseline)
			}
		})
	})

	describe('pointInRect', () => {
		const r = rect(10, 20, 100, 50)

		it('returns true for point inside rect', () => {
			expect(pointInRect(point(50, 40), r)).toBe(true)
		})

		it('returns true for point on left edge', () => {
			expect(pointInRect(point(10, 40), r)).toBe(true)
		})

		it('returns true for point on right edge', () => {
			expect(pointInRect(point(110, 40), r)).toBe(true)
		})

		it('returns true for point on top edge', () => {
			expect(pointInRect(point(50, 20), r)).toBe(true)
		})

		it('returns true for point on bottom edge', () => {
			expect(pointInRect(point(50, 70), r)).toBe(true)
		})

		it('returns true for point on corner', () => {
			expect(pointInRect(point(10, 20), r)).toBe(true)
			expect(pointInRect(point(110, 20), r)).toBe(true)
			expect(pointInRect(point(10, 70), r)).toBe(true)
			expect(pointInRect(point(110, 70), r)).toBe(true)
		})

		it('returns false for point outside left', () => {
			expect(pointInRect(point(9, 40), r)).toBe(false)
		})

		it('returns false for point outside right', () => {
			expect(pointInRect(point(111, 40), r)).toBe(false)
		})

		it('returns false for point outside top', () => {
			expect(pointInRect(point(50, 19), r)).toBe(false)
		})

		it('returns false for point outside bottom', () => {
			expect(pointInRect(point(50, 71), r)).toBe(false)
		})

		it('handles zero-size rect', () => {
			const zeroRect = rect(10, 20, 0, 0)
			expect(pointInRect(point(10, 20), zeroRect)).toBe(true)
			expect(pointInRect(point(10, 21), zeroRect)).toBe(false)
		})
	})

	describe('nodeBounds', () => {
		describe('rect node', () => {
			it('returns the rect bounds', () => {
				const node: SceneNode<never> = {
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
				}
				expect(nodeBounds(node)).toEqual(rect(10, 20, 100, 50))
			})
		})

		describe('line node', () => {
			it('returns bounding box of line points', () => {
				const node: SceneNode<never> = {
					kind: 'line',
					points: [point(10, 20), point(50, 80), point(30, 40)],
					stroke: stroke('black', 1),
				}
				expect(nodeBounds(node)).toEqual({
					x: 10,
					y: 20,
					width: 40, // 50 - 10
					height: 60, // 80 - 20
				})
			})

			it('returns undefined for empty points array', () => {
				const node: SceneNode<never> = {
					kind: 'line',
					points: [],
					stroke: stroke('black', 1),
				}
				expect(nodeBounds(node)).toBeUndefined()
			})

			it('handles single point', () => {
				const node: SceneNode<never> = {
					kind: 'line',
					points: [point(10, 20)],
					stroke: stroke('black', 1),
				}
				expect(nodeBounds(node)).toEqual({
					x: 10,
					y: 20,
					width: 0,
					height: 0,
				})
			})

			it('handles horizontal line', () => {
				const node: SceneNode<never> = {
					kind: 'line',
					points: [point(10, 20), point(50, 20)],
					stroke: stroke('black', 1),
				}
				expect(nodeBounds(node)).toEqual({
					x: 10,
					y: 20,
					width: 40,
					height: 0,
				})
			})

			it('handles vertical line', () => {
				const node: SceneNode<never> = {
					kind: 'line',
					points: [point(10, 20), point(10, 80)],
					stroke: stroke('black', 1),
				}
				expect(nodeBounds(node)).toEqual({
					x: 10,
					y: 20,
					width: 0,
					height: 60,
				})
			})
		})

		describe('text node', () => {
			it('returns undefined (no accurate bounds without font metrics)', () => {
				const node: SceneNode<never> = {
					kind: 'text',
					position: point(10, 20),
					text: 'Hello',
					style: textStyle('12px Arial', 'black'),
				}
				expect(nodeBounds(node)).toBeUndefined()
			})
		})

		describe('group node', () => {
			it('returns undefined (groups have no inherent bounds)', () => {
				const node: SceneNode<never> = {
					kind: 'group',
					children: [{ kind: 'rect', rect: rect(10, 20, 100, 50) }],
				}
				expect(nodeBounds(node)).toBeUndefined()
			})

			it('returns undefined even with clip', () => {
				const node: SceneNode<never> = {
					kind: 'group',
					children: [],
					clip: rect(0, 0, 100, 100),
				}
				expect(nodeBounds(node)).toBeUndefined()
			})
		})
	})
})
