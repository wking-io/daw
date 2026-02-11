import { describe, expect, it } from 'vitest'
import { hitTest } from './hit-test'
import { point, rect, stroke, textStyle } from './types'
import type { InteractiveNode } from './types'

type TestAction = { type: string; id: string }

describe('timeline/scene/hit-test', () => {
	describe('empty nodes', () => {
		it('returns null for empty node list', () => {
			expect(hitTest([], point(50, 50))).toBeNull()
		})
	})

	describe('rect nodes', () => {
		it('returns action when point is inside rect', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
					action: { type: 'click', id: 'rect1' },
				},
			]
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'rect1',
			})
		})

		it('returns null when point is outside rect', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
					action: { type: 'click', id: 'rect1' },
				},
			]
			expect(hitTest(nodes, point(0, 0))).toBeNull()
		})

		it('returns null for rect without action', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
				},
			]
			expect(hitTest(nodes, point(50, 40))).toBeNull()
		})

		it('returns topmost rect action (last in array)', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
					action: { type: 'click', id: 'bottom' },
				},
				{
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
					action: { type: 'click', id: 'top' },
				},
			]
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'top',
			})
		})

		it('hits rect on edge', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'rect',
					rect: rect(10, 20, 100, 50),
					action: { type: 'click', id: 'rect1' },
				},
			]
			expect(hitTest(nodes, point(10, 20))).toEqual({
				type: 'click',
				id: 'rect1',
			})
			expect(hitTest(nodes, point(110, 70))).toEqual({
				type: 'click',
				id: 'rect1',
			})
		})
	})

	describe('line nodes', () => {
		it('returns action when point is near horizontal line', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(0, 50), point(100, 50)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line1' },
				},
			]
			// Within 4px tolerance
			expect(hitTest(nodes, point(50, 50))).toEqual({
				type: 'click',
				id: 'line1',
			})
			expect(hitTest(nodes, point(50, 52))).toEqual({
				type: 'click',
				id: 'line1',
			})
			expect(hitTest(nodes, point(50, 54))).toEqual({
				type: 'click',
				id: 'line1',
			})
		})

		it('returns null when point is far from line', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(0, 50), point(100, 50)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line1' },
				},
			]
			// Beyond 4px tolerance
			expect(hitTest(nodes, point(50, 55))).toBeNull()
		})

		it('returns action when point is near diagonal line', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(0, 0), point(100, 100)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line1' },
				},
			]
			// Point on the line
			expect(hitTest(nodes, point(50, 50))).toEqual({
				type: 'click',
				id: 'line1',
			})
		})

		it('returns null for line without action', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(0, 50), point(100, 50)],
					stroke: stroke('black', 1),
				},
			]
			expect(hitTest(nodes, point(50, 50))).toBeNull()
		})

		it('handles line with fewer than 2 points', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(50, 50)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line1' },
				},
			]
			expect(hitTest(nodes, point(50, 50))).toBeNull()
		})

		it('handles multi-segment line', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(0, 0), point(50, 0), point(50, 50), point(100, 50)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line1' },
				},
			]
			// On first segment
			expect(hitTest(nodes, point(25, 0))).toEqual({
				type: 'click',
				id: 'line1',
			})
			// On second segment
			expect(hitTest(nodes, point(50, 25))).toEqual({
				type: 'click',
				id: 'line1',
			})
			// On third segment
			expect(hitTest(nodes, point(75, 50))).toEqual({
				type: 'click',
				id: 'line1',
			})
		})

		it('handles zero-length segment (point)', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'line',
					points: [point(50, 50), point(50, 50)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line1' },
				},
			]
			expect(hitTest(nodes, point(50, 50))).toEqual({
				type: 'click',
				id: 'line1',
			})
			expect(hitTest(nodes, point(55, 55))).toBeNull()
		})
	})

	describe('text nodes', () => {
		// Note: Text hit testing always returns null in the current implementation.
		// Text nodes are expected to be rendered to DOM where they get native event handling.
		// Canvas-based hit testing for text would require font metrics which aren't available.

		it('returns null for text nodes (text uses DOM events instead)', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'text',
					position: point(10, 20),
					text: 'Hello',
					style: textStyle('12px Arial', 'black'),
					action: { type: 'click', id: 'text1' },
				},
			]
			// Text hit testing is not implemented - use DOM adapter for text interaction
			expect(hitTest(nodes, point(25, 28))).toBeNull()
		})

		it('returns null for text without action', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'text',
					position: point(10, 20),
					text: 'Hello',
					style: textStyle('12px Arial', 'black'),
				},
			]
			expect(hitTest(nodes, point(15, 25))).toBeNull()
		})
	})

	describe('group nodes', () => {
		it('returns child action when point hits child', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [
						{
							kind: 'rect',
							rect: rect(10, 20, 100, 50),
							action: { type: 'click', id: 'child' },
						} as InteractiveNode<TestAction>,
					],
				},
			]
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'child',
			})
		})

		it('returns group action when children miss but group has action', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [
						{
							kind: 'rect',
							rect: rect(10, 20, 100, 50),
						},
					],
					action: { type: 'click', id: 'group' },
				},
			]
			// Point inside child rect but child has no action
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'group',
			})
		})

		it('returns group action when point is in clip bounds', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [],
					clip: rect(0, 0, 100, 100),
					action: { type: 'click', id: 'group' },
				},
			]
			expect(hitTest(nodes, point(50, 50))).toEqual({
				type: 'click',
				id: 'group',
			})
		})

		it('returns null when point is outside clip bounds', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [],
					clip: rect(0, 0, 100, 100),
					action: { type: 'click', id: 'group' },
				},
			]
			expect(hitTest(nodes, point(150, 150))).toBeNull()
		})

		it('prioritizes child action over group action', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [
						{
							kind: 'rect',
							rect: rect(10, 20, 100, 50),
							action: { type: 'click', id: 'child' },
						} as InteractiveNode<TestAction>,
					],
					action: { type: 'click', id: 'group' },
				},
			]
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'child',
			})
		})

		it('tests children in reverse order (topmost first)', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [
						{
							kind: 'rect',
							rect: rect(10, 20, 100, 50),
							action: { type: 'click', id: 'bottom' },
						} as InteractiveNode<TestAction>,
						{
							kind: 'rect',
							rect: rect(10, 20, 100, 50),
							action: { type: 'click', id: 'top' },
						} as InteractiveNode<TestAction>,
					],
				},
			]
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'top',
			})
		})

		it('handles nested groups', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'group',
					children: [
						{
							kind: 'group',
							children: [
								{
									kind: 'rect',
									rect: rect(10, 20, 100, 50),
									action: { type: 'click', id: 'nested' },
								} as InteractiveNode<TestAction>,
							],
						} as InteractiveNode<TestAction>,
					],
				},
			]
			expect(hitTest(nodes, point(50, 40))).toEqual({
				type: 'click',
				id: 'nested',
			})
		})
	})

	describe('mixed node types', () => {
		it('tests rect and line node types correctly', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'rect',
					rect: rect(0, 0, 50, 50),
					action: { type: 'click', id: 'rect' },
				},
				{
					kind: 'line',
					points: [point(60, 25), point(110, 25)],
					stroke: stroke('black', 1),
					action: { type: 'click', id: 'line' },
				},
			]

			expect(hitTest(nodes, point(25, 25))).toEqual({
				type: 'click',
				id: 'rect',
			})
			expect(hitTest(nodes, point(85, 25))).toEqual({
				type: 'click',
				id: 'line',
			})
			expect(hitTest(nodes, point(200, 200))).toBeNull()
		})

		it('text nodes do not participate in hit testing', () => {
			const nodes: InteractiveNode<TestAction>[] = [
				{
					kind: 'text',
					position: point(10, 20),
					text: 'Click me',
					style: textStyle('12px Arial', 'black'),
					action: { type: 'click', id: 'text' },
				},
			]
			// Text hit testing returns null - DOM handles text events
			expect(hitTest(nodes, point(15, 25))).toBeNull()
		})
	})
})
