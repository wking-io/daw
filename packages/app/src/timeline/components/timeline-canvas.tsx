import type { Handle } from '@remix-run/component'

import type { Projection1D } from '../foundation/projection1d'
import type * as Px from '../lib/px'
import type { TimelineHostEnv } from '../renderers/core'
import type { SceneRenderer } from '../renderers/types'
import { renderToCanvas } from '../scene'
import { prepareCanvas } from '../utils/prepare-canvas'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRenderer = SceneRenderer<any, any, any>

export function TimelineCanvas(handle: Handle) {
	let canvasEl: HTMLCanvasElement

	return (props: {
		dpr: number
		projection: Projection1D<Px.Px>
		size: { width: number; height: number }
		height: number
		surface: 'main' | 'navigator'
		fitToHeight: boolean
		renderer: AnyRenderer
		data: unknown
		ui: unknown
		class?: string
	}) => {
		handle.queueTask(() => {
			if (!canvasEl) return

			const env: TimelineHostEnv = {
				canvas: {
					dpr: props.dpr,
					widthPx: props.size.width as Px.Px,
					heightPx: props.size.height as Px.Px,
				},
				surface: props.surface,
				fitToHeight: props.fitToHeight,
			}

			const ctx = prepareCanvas({
				canvas: canvasEl,
				cssW: Math.max(1, props.size.width),
				cssH: props.height,
				dpr: props.dpr,
			})
			if (!ctx) return

			const scene = props.renderer.buildScene({
				data: props.data,
				projection: props.projection,
				ui: props.ui,
				env,
			})
			renderToCanvas(ctx, scene.canvas)
		})

		return (
			<canvas
				connect={(node: HTMLCanvasElement) => {
					canvasEl = node
				}}
				draggable={false}
				class={props.class}
				style={{
					position: 'absolute',
					inset: '0',
					pointerEvents: 'none',
				}}
			/>
		)
	}
}
