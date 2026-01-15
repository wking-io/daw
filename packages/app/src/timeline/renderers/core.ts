import type { Projection1D } from '../foundation/projection1d'
import type { Px } from '../lib/px'

export type CanvasEnv = Readonly<{
	dpr: number
	widthPx: Px
	heightPx: Px
}>

export type TimelineHostEnv = Readonly<{
	canvas: CanvasEnv
	surface: 'main' | 'navigator'
	/** If true, the renderer should scale/compress vertical layout to fit `canvas.heightPx`. */
	fitToHeight: boolean
}>

export type TimelineRendererCore<
	Data,
	UiState,
	Action,
	RenderModel = unknown,
> = Readonly<{
	kind: string
	buildModel: (args: {
		data: Data
		projection: Projection1D<Px>
		ui: UiState
		env: TimelineHostEnv
	}) => RenderModel
	drawCanvas?: (args: {
		ctx: CanvasRenderingContext2D
		model: RenderModel
		projection: Projection1D<Px>
		ui: UiState
		env: TimelineHostEnv
	}) => void
	/**
	 * Optional pure hit-testing. If provided, the UI host can implement pointer handling
	 * without coupling event handlers to the overlay tree.
	 */
	hitTest?: (args: {
		model: RenderModel
		projection: Projection1D<Px>
		ui: UiState
		env: TimelineHostEnv
		xPx: Px
		yPx: Px
	}) => Action | null
}>
