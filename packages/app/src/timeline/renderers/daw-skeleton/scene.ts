import * as Px from '@daw/core/lib/px'
import type { InteractiveNode, Scene, SceneNode } from '../../scene'
import { point, rect, stroke } from '../../scene'
import type { TimelineTheme } from '../core'
import type { SceneRenderer, BuildSceneArgs } from '../types'
import type { DawAction, DawClip, DawData, DawUiState } from './types'

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TRACK_HEIGHT_PX = 28
const CLIP_VERTICAL_PADDING = 3
const GRID_MAJOR_INTERVAL = 100

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Parse a CSS color string to RGB components.
 * Supports hex (#rgb, #rrggbb), rgb(), and rgba() formats.
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
	// Hex format
	const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
	if (hexMatch) {
		const hex = hexMatch[1]!
		if (hex.length === 3) {
			return {
				r: parseInt(hex[0]! + hex[0]!, 16),
				g: parseInt(hex[1]! + hex[1]!, 16),
				b: parseInt(hex[2]! + hex[2]!, 16),
			}
		}
		return {
			r: parseInt(hex.slice(0, 2), 16),
			g: parseInt(hex.slice(2, 4), 16),
			b: parseInt(hex.slice(4, 6), 16),
		}
	}

	// rgb/rgba format
	const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
	if (rgbMatch) {
		return {
			r: parseInt(rgbMatch[1]!, 10),
			g: parseInt(rgbMatch[2]!, 10),
			b: parseInt(rgbMatch[3]!, 10),
		}
	}

	return null
}

/**
 * Convert RGB to hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (n: number) => n.toString(16).padStart(2, '0')
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Derive clip colors from a track's base color.
 * Uses solid colors by darkening the track color.
 */
function deriveClipColors(
	trackColor: string,
	isSelected: boolean,
	theme: TimelineTheme,
): { fill: string; border: string } {
	const parsed = parseColor(trackColor)

	if (!parsed) {
		// Fallback to theme colors if parsing fails
		return isSelected
			? { fill: theme.clipFallbackFillSelected, border: theme.clipBorderSelected }
			: { fill: theme.clipFallbackFill, border: theme.clipFallbackBorder }
	}

	const { r, g, b } = parsed

	if (isSelected) {
		return {
			fill: rgbToHex(r, g, b),
			border: theme.clipBorderSelected,
		}
	}

	return {
		fill: rgbToHex(r, g, b),
		border: rgbToHex(r, g, b),
	}
}

function deriveNavigatorClipFill(trackColor: string, theme: TimelineTheme): string {
	const parsed = parseColor(trackColor)
	if (!parsed) return theme.clipFallbackBorder
	const { r, g, b } = parsed
	return rgbToHex(r, g, b)
}

// =============================================================================
// Helper Functions
// =============================================================================

function computeTrackHeightPx(args: {
	trackCount: number
	fitToHeight: boolean
	canvasHeightPx: Px.Px
}): Px.Px {
	const { trackCount, fitToHeight, canvasHeightPx } = args
	if (!fitToHeight) return Px.Px(DEFAULT_TRACK_HEIGHT_PX)
	return Px.Px(Number(canvasHeightPx) / Math.max(1, trackCount))
}

type ClipLayout = {
	clip: DawClip
	x: Px.Px
	y: Px.Px
	width: Px.Px
	height: Px.Px
	isSelected: boolean
	trackColor: string
}

function computeClipLayouts(args: {
	data: DawData
	ui: DawUiState
	projection: { contentToScreenX: (x: Px.Px) => Px.Px }
	trackHeightPx: Px.Px
}): ClipLayout[] {
	const { data, ui, projection, trackHeightPx } = args

	const trackById = new Map<string, { index: number; color: string }>()
	for (let i = 0; i < data.tracks.length; i++) {
		const track = data.tracks[i]!
		trackById.set(track.id, { index: i, color: track.color })
	}

	const layouts: ClipLayout[] = []

	for (const clip of data.clips) {
		const trackInfo = trackById.get(clip.trackId)
		if (trackInfo == null) continue

		const leftPx = projection.contentToScreenX(clip.start)
		const rightPx = projection.contentToScreenX(clip.end)
		const widthPx = Px.max(Px.Px(1), Px.subtract(rightPx, leftPx))

		const topPx = Px.add(
			Px.multiply(trackHeightPx, trackInfo.index),
			Px.Px(CLIP_VERTICAL_PADDING),
		)
		const heightPx = Px.max(
			Px.Px(1),
			Px.subtract(trackHeightPx, Px.Px(CLIP_VERTICAL_PADDING * 2)),
		)

		layouts.push({
			clip,
			x: leftPx,
			y: topPx,
			width: widthPx,
			height: heightPx,
			isSelected: ui.selectedClipId === clip.id,
			trackColor: trackInfo.color,
		})
	}

	return layouts
}

// =============================================================================
// Scene Builder
// =============================================================================

/**
 * Build canvas nodes for the main (projection) surface.
 * Includes background and grid lines only - clips are rendered as DOM for interactivity.
 */
function buildMainCanvasNodes(args: {
	projection: BuildSceneArgs<DawData, DawUiState>['projection']
	env: BuildSceneArgs<DawData, DawUiState>['env']
}): SceneNode<never>[] {
	const { projection, env } = args
	const nodes: SceneNode<never>[] = []

	const canvasWidth = env.canvas.widthPx
	const canvasHeight = env.canvas.heightPx

	// Background
	nodes.push({
		kind: 'rect',
		rect: rect(Px.Px(0), Px.Px(0), canvasWidth, canvasHeight),
		fill: env.theme.background,
	})

	// Vertical grid lines (content-space every 100 px)
	const viewStart = Number(projection.view.start)
	const viewEnd = viewStart + Number(projection.view.size)
	const first =
		Math.floor(viewStart / GRID_MAJOR_INTERVAL) * GRID_MAJOR_INTERVAL

	const gridStroke = stroke(env.theme.gridLine, 1)
	for (
		let t = first;
		t <= viewEnd + GRID_MAJOR_INTERVAL;
		t += GRID_MAJOR_INTERVAL
	) {
		const x = Px.Px(Number(projection.contentToScreenX(Px.Px(t))) + 0.5)
		nodes.push({
			kind: 'line',
			points: [point(x, Px.Px(0)), point(x, canvasHeight)],
			stroke: gridStroke,
		})
	}

	return nodes
}

/**
 * Build canvas nodes for the navigator surface.
 * Low fidelity: just track separators and simple clip rectangles.
 * No grid lines, no text, no interactivity.
 */
function buildNavigatorCanvasNodes(args: {
	data: DawData
	clipLayouts: ClipLayout[]
	env: BuildSceneArgs<DawData, DawUiState>['env']
	trackHeightPx: Px.Px
}): SceneNode<never>[] {
	const { data, clipLayouts, env, trackHeightPx } = args
	const nodes: SceneNode<never>[] = []

	const canvasWidth = env.canvas.widthPx

	// Only render track separator lines if 4 or fewer tracks
	const showSeparators = data.tracks.length <= 4
	if (showSeparators) {
		const borderStroke = stroke(env.theme.gridLine, 1)
		for (let i = 1; i < data.tracks.length; i++) {
			const y = Px.Px(Number(Px.multiply(trackHeightPx, i)) + 0.5) // +0.5 for crisp 1px line
			nodes.push({
				kind: 'line',
				points: [point(Px.Px(0), y), point(canvasWidth, y)],
				stroke: borderStroke,
			})
		}
	}

	// Simple clip rectangles using track colors
	// Height is 1px less if showing separators to avoid overlap
	const clipHeight = showSeparators
		? Px.subtract(trackHeightPx, Px.Px(1))
		: trackHeightPx
	for (const layout of clipLayouts) {
		nodes.push({
			kind: 'rect',
			rect: rect(layout.x, layout.y, layout.width, clipHeight),
			fill: deriveNavigatorClipFill(layout.trackColor, env.theme),
		})
	}

	return nodes
}

function buildDomNodes(args: {
	clipLayouts: ClipLayout[]
	env: BuildSceneArgs<DawData, DawUiState>['env']
}): InteractiveNode<DawAction>[] {
	const { clipLayouts, env } = args
	const nodes: InteractiveNode<DawAction>[] = []

	// Background hit area to clear selection
	nodes.push({
		kind: 'rect',
		rect: rect(Px.Px(0), Px.Px(0), env.canvas.widthPx, env.canvas.heightPx),
		action: { type: 'select-clip', clipId: null },
	})

	// Clip elements
	for (const layout of clipLayouts) {
		const { fill: bgColor, border: borderColor } = deriveClipColors(
			layout.trackColor,
			layout.isSelected,
			env.theme,
		)

		// Use clip rect for group bounds so groups don't overlap
		const clipRect = rect(layout.x, layout.y, layout.width, layout.height)

		nodes.push({
			kind: 'group',
			clip: clipRect,
			children: [
				// Clip background (positioned at 0,0 within the group)
				{
					kind: 'rect',
					rect: rect(Px.Px(0), Px.Px(0), layout.width, layout.height),
					fill: bgColor,
					stroke: stroke(borderColor, 1),
				},
				// Clip title (positioned inside the clip, relative to group)
				{
					kind: 'text',
					position: point(
						Px.Px(8), // padding-left
						Px.Px(Number(layout.height) / 2), // vertically centered (baseline: middle handles offset)
					),
					text: layout.clip.title,
					style: {
						font: '12px system-ui, sans-serif',
						color: 'white',
						baseline: 'middle',
					},
				},
			],
			action: { type: 'select-clip', clipId: layout.clip.id },
		})
	}

	return nodes
}

// =============================================================================
// Scene Renderer
// =============================================================================

/**
 * Scene graph based DAW skeleton renderer.
 *
 * Renders differently based on surface:
 * - **main**: Full fidelity with canvas grid + DOM interactive clips
 * - **navigator**: Low fidelity canvas-only (track lanes + simple clip shapes, not interactive)
 */
export const DawSkeletonSceneRenderer: SceneRenderer<
	DawData,
	DawUiState,
	DawAction
> = {
	kind: 'daw-skeleton',

	buildScene: ({ data, projection, ui, env }): Scene<DawAction> => {
		const trackHeightPx = computeTrackHeightPx({
			trackCount: data.tracks.length,
			fitToHeight: env.fitToHeight,
			canvasHeightPx: env.canvas.heightPx,
		})

		const clipLayouts = computeClipLayouts({
			data,
			ui,
			projection,
			trackHeightPx,
		})

		// Navigator: low fidelity, canvas-only, not interactive
		if (env.surface === 'navigator') {
			return {
				canvas: buildNavigatorCanvasNodes({
					data,
					clipLayouts,
					env,
					trackHeightPx,
				}),
				dom: [], // No interactive elements in navigator
			}
		}

		// Main (projection): full fidelity with interactive DOM clips
		return {
			canvas: buildMainCanvasNodes({ projection, env }),
			dom: buildDomNodes({ clipLayouts, env }),
		}
	},
}
