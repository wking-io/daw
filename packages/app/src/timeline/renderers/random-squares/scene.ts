import * as Px from '../../lib/px'
import type { Scene, SceneNode } from '../../scene'
import { rect } from '../../scene'
import type { SceneRenderer, BuildSceneArgs } from '../types'

const ROWS = 20
const CELL_CONTENT_PX = 10

function hash32(a: number): number {
	// https://stackoverflow.com/a/12996028
	a = a ^ 61 ^ (a >>> 16)
	a = a + (a << 3)
	a = a ^ (a >>> 4)
	a = a * 0x27d4eb2d
	a = a ^ (a >>> 15)
	return a >>> 0
}

function colorForCell(col: number, row: number): string {
	const h = hash32((col * 73856093) ^ (row * 19349663))
	const r = h & 0xff
	const g = (h >>> 8) & 0xff
	const b = (h >>> 16) & 0xff
	return `rgb(${r},${g},${b})`
}

/**
 * Scene graph based random squares renderer.
 * Generates colored cells for testing/demo purposes.
 */
export const RandomSquaresSceneRenderer: SceneRenderer<
	Record<string, never>,
	Record<string, never>,
	never
> = {
	kind: 'random-squares',

	buildScene: ({
		projection,
		env,
	}: BuildSceneArgs<
		Record<string, never>,
		Record<string, never>
	>): Scene<never> => {
		const canvasNodes: SceneNode<never>[] = []

		// Calculate row height
		const rowHeightScreenPx = env.fitToHeight
			? Math.max(1, Number(env.canvas.heightPx) / Math.max(1, ROWS))
			: 10

		// Calculate cell dimensions
		const { view, scale } = projection
		if (scale <= 1e-9) {
			return { canvas: [], dom: [] }
		}

		const cellScreenW = CELL_CONTENT_PX * scale
		if (cellScreenW <= 0.01) {
			return { canvas: [], dom: [] }
		}

		// Compute visible column range in content-space
		const viewStart = Number(view.start)
		const viewEnd = viewStart + Number(view.size)
		const startCol = Math.floor(viewStart / CELL_CONTENT_PX)
		const endCol = Math.ceil(viewEnd / CELL_CONTENT_PX)

		// Generate rect nodes for each visible cell
		for (let row = 0; row < ROWS; row++) {
			const y = row * rowHeightScreenPx

			for (let col = startCol; col < endCol; col++) {
				const cellXContent = Px.Px(col * CELL_CONTENT_PX)
				const x = projection.contentToScreenX(cellXContent)

				canvasNodes.push({
					kind: 'rect',
					rect: rect(x, Px.Px(y), Px.Px(cellScreenW), Px.Px(rowHeightScreenPx)),
					fill: colorForCell(col, row),
				})
			}
		}

		return {
			canvas: canvasNodes,
			dom: [], // No interactive elements in this renderer
		}
	},
}
