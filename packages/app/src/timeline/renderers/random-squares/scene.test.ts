import { describe, expect, it } from 'vitest'
import type { Projection1D } from '../../foundation/projection1d'
import * as Px from '../../lib/px'
import type { TimelineHostEnv } from '../core'
import { RandomSquaresSceneRenderer } from './scene'

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockProjection(options: {
	viewStart?: number
	viewSize?: number
	scale?: number
}): Projection1D<Px.Px> {
	const { viewStart = 0, viewSize = 100, scale = 1 } = options

	return {
		scale,
		viewportWidthPx: Px.Px(viewSize * scale),
		size: Px.Px(1000),
		view: {
			start: Px.Px(viewStart),
			size: Px.Px(viewSize),
		},
		contentToScreenX: (x: Px.Px) => Px.Px((Number(x) - viewStart) * scale),
		screenToContentX: (x: Px.Px) => Px.Px(Number(x) / scale + viewStart),
	}
}

function createMockEnv(options: {
	width?: number
	height?: number
	fitToHeight?: boolean
}): TimelineHostEnv {
	const { width = 100, height = 200, fitToHeight = true } = options

	return {
		canvas: {
			dpr: 1,
			widthPx: Px.Px(width),
			heightPx: Px.Px(height),
		},
		surface: 'main',
		fitToHeight,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe('timeline/renderers/random-squares/scene', () => {
	describe('RandomSquaresSceneRenderer', () => {
		it('has correct kind', () => {
			expect(RandomSquaresSceneRenderer.kind).toBe('random-squares')
		})

		describe('buildScene', () => {
			it('returns empty scene when scale is too small', () => {
				const projection = createMockProjection({ scale: 1e-10 })
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				expect(scene.canvas).toEqual([])
				expect(scene.dom).toEqual([])
			})

			it('returns empty scene when cell screen width is too small', () => {
				// Scale of 0.0001 with CELL_CONTENT_PX=10 gives cellScreenW of 0.001
				const projection = createMockProjection({ scale: 0.0001 })
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				expect(scene.canvas).toEqual([])
				expect(scene.dom).toEqual([])
			})

			it('generates rect nodes for visible cells', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 30, // 3 cells at CELL_CONTENT_PX=10
					scale: 1,
				})
				const env = createMockEnv({ height: 200 })

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// 20 rows * 3 columns = 60 rect nodes
				expect(scene.canvas.length).toBe(60)
				expect(scene.dom).toEqual([])
			})

			it('all nodes are rect nodes with fill colors', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 20,
					scale: 1,
				})
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				for (const node of scene.canvas) {
					expect(node.kind).toBe('rect')
					if (node.kind === 'rect') {
						expect(node.fill).toBeDefined()
						expect(node.fill).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
					}
				}
			})

			it('calculates row height based on fitToHeight', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 10, // 1 cell
					scale: 1,
				})
				const env = createMockEnv({ height: 200, fitToHeight: true })

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// With 20 rows and height 200, each row is 10px
				// First row y=0, second row y=10, etc.
				const rectNodes = scene.canvas.filter((n) => n.kind === 'rect')
				expect(rectNodes.length).toBe(20) // 20 rows * 1 column

				// Check first few rows have correct y positions
				if (rectNodes[0]?.kind === 'rect') {
					expect(rectNodes[0].rect.y).toBe(0)
					expect(rectNodes[0].rect.height).toBe(10) // 200 / 20 rows
				}
				if (rectNodes[1]?.kind === 'rect') {
					expect(rectNodes[1].rect.y).toBe(10)
				}
			})

			it('uses fixed row height when fitToHeight is false', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 10,
					scale: 1,
				})
				const env = createMockEnv({ height: 200, fitToHeight: false })

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				const rectNodes = scene.canvas.filter((n) => n.kind === 'rect')

				// Fixed row height is 10
				if (rectNodes[0]?.kind === 'rect') {
					expect(rectNodes[0].rect.height).toBe(10)
				}
				if (rectNodes[1]?.kind === 'rect') {
					expect(rectNodes[1].rect.y).toBe(10)
				}
			})

			it('correctly positions cells based on projection', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 20, // 2 cells
					scale: 2, // 2x scale
				})
				const env = createMockEnv({ height: 200 })

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// First column cells should be at x=0, width=20 (CELL_CONTENT_PX * scale)
				const firstColumnNodes = scene.canvas.filter(
					(n) => n.kind === 'rect' && n.rect.x === 0,
				)
				expect(firstColumnNodes.length).toBe(20) // All rows

				if (firstColumnNodes[0]?.kind === 'rect') {
					expect(firstColumnNodes[0].rect.width).toBe(20) // 10 * 2 scale
				}
			})

			it('handles view offset correctly', () => {
				const projection = createMockProjection({
					viewStart: 50, // Start at position 50
					viewSize: 20, // 2 cells visible
					scale: 1,
				})
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// Starting at 50 with cell size 10, visible columns are 5 and 6
				// Cell 5 starts at content x=50, screen x=0
				// Cell 6 starts at content x=60, screen x=10
				const rectNodes = scene.canvas.filter((n) => n.kind === 'rect')

				// Should have 2 columns * 20 rows = 40 nodes
				expect(rectNodes.length).toBe(40)

				// First cell in first row should be at screen x=0
				if (rectNodes[0]?.kind === 'rect') {
					expect(rectNodes[0].rect.x).toBe(0)
				}
			})

			it('produces deterministic colors for same cell positions', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 30,
					scale: 1,
				})
				const env = createMockEnv({})

				const scene1 = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				const scene2 = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// Same inputs should produce same colors
				expect(scene1.canvas.length).toBe(scene2.canvas.length)
				for (let i = 0; i < scene1.canvas.length; i++) {
					const node1 = scene1.canvas[i]
					const node2 = scene2.canvas[i]
					if (node1?.kind === 'rect' && node2?.kind === 'rect') {
						expect(node1.fill).toBe(node2.fill)
					}
				}
			})

			it('produces different colors for different cell positions', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 30,
					scale: 1,
				})
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// Collect unique colors
				const colors = new Set<string>()
				for (const node of scene.canvas) {
					if (node.kind === 'rect' && node.fill) {
						colors.add(node.fill)
					}
				}

				// Should have many unique colors (not all the same)
				expect(colors.size).toBeGreaterThan(1)
			})

			it('handles scale correctly for cell widths', () => {
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 10,
					scale: 5,
				})
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				// Cell width should be CELL_CONTENT_PX (10) * scale (5) = 50
				const firstNode = scene.canvas[0]
				if (firstNode?.kind === 'rect') {
					expect(firstNode.rect.width).toBe(50)
				}
			})

			it('never produces dom nodes (no interactivity)', () => {
				const projection = createMockProjection({})
				const env = createMockEnv({})

				const scene = RandomSquaresSceneRenderer.buildScene({
					data: {},
					projection,
					ui: {},
					env,
				})

				expect(scene.dom).toEqual([])
			})
		})
	})
})
