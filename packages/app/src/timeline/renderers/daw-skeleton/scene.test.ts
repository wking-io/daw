import { describe, expect, it } from 'bun:test'
import type { Projection1D } from '../../foundation/projection1d'
import * as QN from '@daw/core/lib/qn'
import * as Px from '@daw/core/lib/px'
import type { TimelineHostEnv, TimelineTheme } from '../core'
import { DawSkeletonSceneRenderer } from './scene'
import type { DawClip, DawData, DawTrack, DawUiState } from './types'

const MOCK_THEME: TimelineTheme = {
	gridLine: 'oklch(37.67% 0.0074 66.2)',
	clipFallbackFill: 'oklch(19.19% 0.0038 66.2)',
	clipFallbackFillSelected: 'oklch(37.67% 0.0074 66.2)',
	clipFallbackBorder: 'oklch(45.24% 0.0089 66.2)',
	clipBorderSelected: 'oklch(89.57% 0.005 66.2)',
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockProjection(options: {
	viewStart?: number
	viewSize?: number
	scale?: number
}): Projection1D<QN.QN> {
	const { viewStart = 0, viewSize = 100, scale = 1 } = options

	return {
		scale,
		viewportWidthPx: Px.Px(viewSize * scale),
		size: QN.QN(1000),
		view: {
			start: QN.QN(viewStart),
			size: QN.QN(viewSize),
		},
		contentToScreenX: (x: QN.QN) => Px.Px((Number(x) - viewStart) * scale),
		screenToContentX: (x: Px.Px) => QN.QN(Number(x) / scale + viewStart),
	}
}

function createMockEnv(options: {
	width?: number
	height?: number
	fitToHeight?: boolean
	surface?: 'main' | 'navigator'
}): TimelineHostEnv {
	const {
		width = 400,
		height = 200,
		fitToHeight = true,
		surface = 'main',
	} = options

	return {
		canvas: {
			dpr: 1,
			widthPx: Px.Px(width),
			heightPx: Px.Px(height),
		},
		surface,
		fitToHeight,
		theme: MOCK_THEME,
	}
}

function createTrack(
	id: string,
	name: string,
	color: string = '#6366f1',
): DawTrack {
	return { id, name, color }
}

function createClip(
	id: string,
	trackId: string,
	start: number,
	end: number,
	title: string,
): DawClip {
	return {
		id,
		trackId,
		start: QN.QN(start),
		end: QN.QN(end),
		title,
	}
}

function createDawData(tracks: DawTrack[], clips: DawClip[]): DawData {
	return { tracks, clips }
}

function createUiState(selectedClipId: string | null = null): DawUiState {
	return { selectedClipId }
}

// =============================================================================
// Tests
// =============================================================================

describe('timeline/renderers/daw-skeleton/scene', () => {
	describe('DawSkeletonSceneRenderer', () => {
		it('has correct kind', () => {
			expect(DawSkeletonSceneRenderer.kind).toBe('daw-skeleton')
		})

		describe('buildScene - canvas nodes', () => {
			it('generates vertical grid lines', () => {
				const data = createDawData([], [])
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 250, // Should show grid at 0, 4, 8, ...
					scale: 1,
				})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const gridLines = scene.canvas.filter(
					(n) => n.kind === 'line' && n.stroke.color === MOCK_THEME.gridLine,
				)

				// Grid lines at intervals of 4 QN, plus buffer
				expect(gridLines.length).toBeGreaterThanOrEqual(3)
			})

			it('positions grid lines based on view offset', () => {
				const data = createDawData([], [])
				const projection = createMockProjection({
					viewStart: 50,
					viewSize: 100,
					scale: 1,
				})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const gridLines = scene.canvas.filter(
					(n) => n.kind === 'line' && n.stroke.color === MOCK_THEME.gridLine,
				)

				// Should have grid lines - exact count depends on view
				expect(gridLines.length).toBeGreaterThan(0)
			})

			it('calculates track height with fitToHeight for dom clip positioning', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1'),
						createTrack('t2', 'Track 2'),
						createTrack('t3', 'Track 3'),
						createTrack('t4', 'Track 4'),
					],
					[
						createClip('c1', 't1', 0, 50, 'Clip 1'),
						createClip('c2', 't2', 0, 50, 'Clip 2'),
						createClip('c3', 't3', 0, 50, 'Clip 3'),
						createClip('c4', 't4', 0, 50, 'Clip 4'),
					],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({ height: 200, fitToHeight: true })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// With 4 tracks and height 200, each track is 50px
				// Clips should be positioned at y = 3, 53, 103, 153 (with 3px padding)
				const clipGroups = scene.dom.filter((n) => n.kind === 'group')
				expect(clipGroups.length).toBe(4)

				// Group clip property contains the position
				const yPositions = clipGroups.map((g) => {
					if (g.kind === 'group' && g.clip) return g.clip.y
					return null
				})

				expect(yPositions).toContain(3) // track 0: 0 + 3
				expect(yPositions).toContain(53) // track 1: 50 + 3
				expect(yPositions).toContain(103) // track 2: 100 + 3
				expect(yPositions).toContain(153) // track 3: 150 + 3

				// Children should be at 0,0 relative to group
				for (const g of clipGroups) {
					if (g.kind === 'group') {
						const rect = g.children[0]
						if (rect?.kind === 'rect') {
							expect(rect.rect.x).toBe(0)
							expect(rect.rect.y).toBe(0)
						}
					}
				}
			})

			it('uses default track height when fitToHeight is false for dom clip positioning', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1'), createTrack('t2', 'Track 2')],
					[
						createClip('c1', 't1', 0, 50, 'Clip 1'),
						createClip('c2', 't2', 0, 50, 'Clip 2'),
					],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({ height: 200, fitToHeight: false })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Default track height is 28px
				// Clips should be at y = 3, 31 (with 3px padding)
				const clipGroups = scene.dom.filter((n) => n.kind === 'group')
				expect(clipGroups.length).toBe(2)

				// Group clip property contains the position
				const yPositions = clipGroups.map((g) => {
					if (g.kind === 'group' && g.clip) return g.clip.y
					return null
				})

				expect(yPositions).toContain(3) // track 0: 0 + 3
				expect(yPositions).toContain(31) // track 1: 28 + 3
			})
		})

		describe('buildScene - dom nodes', () => {
			it('always includes background hit area for deselection', () => {
				const data = createDawData([], [])
				const projection = createMockProjection({})
				const env = createMockEnv({ width: 400, height: 200 })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const bgNode = scene.dom[0]
				expect(bgNode?.kind).toBe('rect')
				if (bgNode?.kind === 'rect') {
					expect(bgNode.rect).toEqual({ x: 0, y: 0, width: 400, height: 200 })
					expect(bgNode.action).toEqual({ type: 'select-clip', clipId: null })
				}
			})

			it('generates clip group nodes', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 0, 100, 'Clip 1')],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({ height: 100, fitToHeight: true })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Should have background + 1 clip group
				expect(scene.dom.length).toBe(2)

				const clipGroup = scene.dom[1]
				expect(clipGroup?.kind).toBe('group')
				if (clipGroup?.kind === 'group') {
					expect(clipGroup.action).toEqual({
						type: 'select-clip',
						clipId: 'c1',
					})
					expect(clipGroup.children.length).toBe(2) // rect + text
				}
			})

			it('positions clips correctly on their tracks', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1'), createTrack('t2', 'Track 2')],
					[
						createClip('c1', 't1', 0, 50, 'Track 1 Clip'),
						createClip('c2', 't2', 25, 75, 'Track 2 Clip'),
					],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({ height: 200, fitToHeight: true })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Track height = 200 / 2 = 100px
				// Clip padding = 3px vertical
				const clipGroups = scene.dom.filter((n) => n.kind === 'group')
				expect(clipGroups.length).toBe(2)

				// First clip (track 0): y = 0 + 3 = 3 (position in group.clip)
				const clip1 = clipGroups[0]
				if (clip1?.kind === 'group' && clip1.clip) {
					expect(clip1.clip.y).toBe(3) // Track 0 top + padding
				}

				// Second clip (track 1): y = 100 + 3 = 103 (position in group.clip)
				const clip2 = clipGroups[1]
				if (clip2?.kind === 'group' && clip2.clip) {
					expect(clip2.clip.y).toBe(103) // Track 1 top + padding
				}
			})

			it('calculates clip width from start/end positions', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 10, 60, 'Clip')],
				)
				const projection = createMockProjection({ scale: 2 })
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const clipGroup = scene.dom.find((n) => n.kind === 'group')
				if (clipGroup?.kind === 'group' && clipGroup.clip) {
					// Start at 10, end at 60, scale 2
					// Screen x = (10 - 0) * 2 = 20
					// Width = (60 - 10) * 2 = 100
					expect(clipGroup.clip.x).toBe(20)
					expect(clipGroup.clip.width).toBe(100)

					// Children are positioned at 0,0 relative to group
					const clipRect = clipGroup.children[0]
					if (clipRect?.kind === 'rect') {
						expect(clipRect.rect.x).toBe(0)
						expect(clipRect.rect.width).toBe(100)
					}
				}
			})

			it('applies selected styling to selected clip using track color', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1', '#ff5500')], // orange track
					[
						createClip('c1', 't1', 0, 50, 'Selected'),
						createClip('c2', 't1', 60, 100, 'Not Selected'),
					],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState('c1'), // c1 is selected
					env,
				})

				const clipGroups = scene.dom.filter((n) => n.kind === 'group')

				// First clip (selected) - uses track color with selected border
				const selectedClip = clipGroups[0]
				if (selectedClip?.kind === 'group') {
					const rect = selectedClip.children[0]
					if (rect?.kind === 'rect') {
						expect(rect.fill).toBe('#ff5500') // track color
						expect(rect.stroke?.color).toBe(MOCK_THEME.clipBorderSelected)
					}
				}

				// Second clip (not selected) - uses track color for fill and border
				const unselectedClip = clipGroups[1]
				if (unselectedClip?.kind === 'group') {
					const rect = unselectedClip.children[0]
					if (rect?.kind === 'rect') {
						expect(rect.fill).toBe('#ff5500') // track color
						expect(rect.stroke?.color).toBe('#ff5500') // track color
					}
				}
			})

			it('uses different colors for clips on different tracks', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1', '#ff0000'), // red
						createTrack('t2', 'Track 2', '#00ff00'), // green
					],
					[
						createClip('c1', 't1', 0, 50, 'Red Clip'),
						createClip('c2', 't2', 0, 50, 'Green Clip'),
					],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({ height: 200, fitToHeight: true })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const clipGroups = scene.dom.filter((n) => n.kind === 'group')
				expect(clipGroups.length).toBe(2)

				// First clip (red track)
				const redClip = clipGroups[0]
				if (redClip?.kind === 'group') {
					const rect = redClip.children[0]
					if (rect?.kind === 'rect') {
						expect(rect.fill).toBe('#ff0000') // track color
						expect(rect.stroke?.color).toBe('#ff0000') // track color
					}
				}

				// Second clip (green track)
				const greenClip = clipGroups[1]
				if (greenClip?.kind === 'group') {
					const rect = greenClip.children[0]
					if (rect?.kind === 'rect') {
						expect(rect.fill).toBe('#00ff00') // track color
						expect(rect.stroke?.color).toBe('#00ff00') // track color
					}
				}
			})

			it('includes clip title as text node', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 0, 100, 'My Awesome Clip')],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const clipGroup = scene.dom.find((n) => n.kind === 'group')
				if (clipGroup?.kind === 'group') {
					const textNode = clipGroup.children[1]
					expect(textNode?.kind).toBe('text')
					if (textNode?.kind === 'text') {
						expect(textNode.text).toBe('My Awesome Clip')
						expect(textNode.style.font).toBe('12px system-ui, sans-serif')
						expect(textNode.style.color).toBe('white')
						expect(textNode.style.baseline).toBe('middle')
					}
				}
			})

			it('skips clips with invalid track IDs', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[
						createClip('c1', 't1', 0, 50, 'Valid'),
						createClip('c2', 'invalid-track', 60, 100, 'Invalid'),
					],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Should only have background + 1 valid clip
				const clipGroups = scene.dom.filter((n) => n.kind === 'group')
				expect(clipGroups.length).toBe(1)
			})

			it('ensures minimum clip width of 1px', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 50, 50, 'Zero Width')], // start === end
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				const clipGroup = scene.dom.find((n) => n.kind === 'group')
				if (clipGroup?.kind === 'group') {
					const clipRect = clipGroup.children[0]
					if (clipRect?.kind === 'rect') {
						expect(clipRect.rect.width).toBe(1) // Minimum width
					}
				}
			})

			it('handles empty tracks array', () => {
				const data = createDawData([], [])
				const projection = createMockProjection({})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Should still have grid lines in canvas and hit area in dom
				expect(scene.canvas.length).toBeGreaterThanOrEqual(1) // grid lines
				expect(scene.dom.length).toBe(1) // just hit area
			})

			it('handles many clips across multiple tracks', () => {
				const tracks = [
					createTrack('t1', 'Track 1'),
					createTrack('t2', 'Track 2'),
					createTrack('t3', 'Track 3'),
				]
				const clips = [
					createClip('c1', 't1', 0, 50, 'Clip 1'),
					createClip('c2', 't1', 60, 100, 'Clip 2'),
					createClip('c3', 't2', 0, 80, 'Clip 3'),
					createClip('c4', 't3', 20, 90, 'Clip 4'),
				]
				const data = createDawData(tracks, clips)
				const projection = createMockProjection({})
				const env = createMockEnv({})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Background + 4 clip groups
				const clipGroups = scene.dom.filter((n) => n.kind === 'group')
				expect(clipGroups.length).toBe(4)

				// All clips should have select-clip actions
				for (const group of clipGroups) {
					if (group.kind === 'group') {
						expect(group.action?.type).toBe('select-clip')
						expect(group.action?.clipId).toBeTruthy()
					}
				}
			})
		})

		describe('buildScene - integration', () => {
			it('produces complete scene with canvas and dom nodes', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1'), createTrack('t2', 'Track 2')],
					[
						createClip('c1', 't1', 0, 100, 'Clip A'),
						createClip('c2', 't2', 50, 150, 'Clip B'),
					],
				)
				const projection = createMockProjection({
					viewStart: 0,
					viewSize: 200,
					scale: 1,
				})
				const env = createMockEnv({ width: 200, height: 100 })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState('c1'),
					env,
				})

				// Canvas should have grid lines
				expect(scene.canvas.length).toBeGreaterThanOrEqual(1)

				// DOM should have: hit area + 2 clip groups
				expect(scene.dom.length).toBe(3)

				// Verify structure
				expect(scene.canvas[0]?.kind).toBe('line') // grid line
				expect(scene.dom[0]?.kind).toBe('rect') // hit area
				expect(scene.dom[1]?.kind).toBe('group') // clip 1
				expect(scene.dom[2]?.kind).toBe('group') // clip 2
			})
		})

		describe('buildScene - navigator surface', () => {
			it('returns empty dom array for navigator surface', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 0, 100, 'Clip 1')],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({ surface: 'navigator' })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Navigator should have no interactive DOM elements
				expect(scene.dom).toEqual([])
			})

			it('does not render track lane backgrounds for navigator', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1'),
						createTrack('t2', 'Track 2'),
						createTrack('t3', 'Track 3'),
					],
					[],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({
					height: 300,
					fitToHeight: true,
					surface: 'navigator',
				})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// No track lane rects (just separator lines between tracks)
				const rects = scene.canvas.filter((n) => n.kind === 'rect')
				expect(rects.length).toBe(0) // No background or track lane rects

				// Should have 2 separator lines (between tracks)
				const lines = scene.canvas.filter((n) => n.kind === 'line')
				expect(lines.length).toBe(2)
			})

			it('renders clips as simple filled rects for navigator', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[
						createClip('c1', 't1', 0, 50, 'Clip 1'),
						createClip('c2', 't1', 60, 100, 'Clip 2'),
					],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({
					height: 100,
					fitToHeight: true,
					surface: 'navigator',
				})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Should have 2 clip rects (no background or track lane rects)
				const rects = scene.canvas.filter((n) => n.kind === 'rect')
				expect(rects.length).toBe(2)

				// Clip rects should use track color (default #6366f1)
				const clipRects = rects.filter(
					(r) => r.kind === 'rect' && r.fill === '#6366f1', // track color
				)
				expect(clipRects.length).toBe(2)
			})

			it('does not render text or borders for navigator clips', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 0, 100, 'Clip with title')],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({ surface: 'navigator' })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// No text nodes
				const textNodes = scene.canvas.filter((n) => n.kind === 'text')
				expect(textNodes.length).toBe(0)

				// No group nodes
				const groupNodes = scene.canvas.filter((n) => n.kind === 'group')
				expect(groupNodes.length).toBe(0)
			})

			it('renders track separator lines for navigator', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1'),
						createTrack('t2', 'Track 2'),
						createTrack('t3', 'Track 3'),
					],
					[],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({
					height: 300,
					fitToHeight: true,
					surface: 'navigator',
				})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// With 3 tracks, we should have 2 separator lines (between tracks)
				const lineNodes = scene.canvas.filter((n) => n.kind === 'line')
				expect(lineNodes.length).toBe(2)

				// Lines should be at track boundaries (100.5 and 200.5 for crisp rendering)
				const yPositions = lineNodes.map((n) =>
					n.kind === 'line' ? n.points[0]?.y : null,
				)
				expect(yPositions).toContain(100.5) // Between track 0 and 1
				expect(yPositions).toContain(200.5) // Between track 1 and 2
			})

			it('does not render track separators for single track in navigator', () => {
				const data = createDawData([createTrack('t1', 'Track 1')], [])
				const projection = createMockProjection({})
				const env = createMockEnv({ surface: 'navigator' })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// No lines for single track (no borders needed)
				const lineNodes = scene.canvas.filter((n) => n.kind === 'line')
				expect(lineNodes.length).toBe(0)
			})

			it('does not render track separators for more than 4 tracks in navigator', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1'),
						createTrack('t2', 'Track 2'),
						createTrack('t3', 'Track 3'),
						createTrack('t4', 'Track 4'),
						createTrack('t5', 'Track 5'),
					],
					[],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({
					height: 500,
					fitToHeight: true,
					surface: 'navigator',
				})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// No separator lines when more than 4 tracks
				const lineNodes = scene.canvas.filter((n) => n.kind === 'line')
				expect(lineNodes.length).toBe(0)
			})

			it('renders track separators for exactly 4 tracks in navigator', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1'),
						createTrack('t2', 'Track 2'),
						createTrack('t3', 'Track 3'),
						createTrack('t4', 'Track 4'),
					],
					[],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({
					height: 400,
					fitToHeight: true,
					surface: 'navigator',
				})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// 3 separator lines for 4 tracks
				const lineNodes = scene.canvas.filter((n) => n.kind === 'line')
				expect(lineNodes.length).toBe(3)
			})

			it('ignores selection state for navigator clips', () => {
				const data = createDawData(
					[createTrack('t1', 'Track 1')],
					[createClip('c1', 't1', 0, 100, 'Selected Clip')],
				)
				const projection = createMockProjection({})
				const env = createMockEnv({ surface: 'navigator' })

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState('c1'), // c1 is selected
					env,
				})

				// Clip should still use the navigator fill (not selection styling)
				// Track color #6366f1 (no darkening)
				const clipRects = scene.canvas.filter(
					(n) => n.kind === 'rect' && n.fill === '#6366f1',
				)
				expect(clipRects.length).toBe(1)
			})

			it('uses track colors for navigator clips', () => {
				const data = createDawData(
					[
						createTrack('t1', 'Track 1', '#ff0000'), // red
						createTrack('t2', 'Track 2', '#00ff00'), // green
					],
					[
						createClip('c1', 't1', 0, 50, 'Red Clip'),
						createClip('c2', 't2', 0, 50, 'Green Clip'),
					],
				)
				const projection = createMockProjection({ scale: 1 })
				const env = createMockEnv({
					height: 200,
					fitToHeight: true,
					surface: 'navigator',
				})

				const scene = DawSkeletonSceneRenderer.buildScene({
					data,
					projection,
					ui: createUiState(),
					env,
				})

				// Find clip rects by their track colors (no darkening)
				const redClipRects = scene.canvas.filter(
					(n) => n.kind === 'rect' && n.fill === '#ff0000', // track color
				)
				const greenClipRects = scene.canvas.filter(
					(n) => n.kind === 'rect' && n.fill === '#00ff00', // track color
				)

				expect(redClipRects.length).toBe(1)
				expect(greenClipRects.length).toBe(1)
			})
		})
	})
})
