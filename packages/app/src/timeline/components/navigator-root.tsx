import type { Handle, RemixNode } from '@remix-run/component'

import { makeProjection1D } from '../foundation/projection1d'
import type { Projection1D } from '../foundation/projection1d'
import * as Projection from '@daw/core/lib/projection'
import * as Px from '@daw/core/lib/px'
import * as Span from '@daw/core/lib/span'
import type { Span as SpanT } from '@daw/core/lib/span'
import { getPointerPosition } from '../utils/get-pointer-position'
import { TimelineRoot } from './timeline-root'
import type { TimelineRootContext } from './timeline-root'

const DEFAULT_HEIGHT = 26

export type NavigatorRootContext = {
	size: { width: number; height: number }
	scale: number
	projection: Projection1D<Px.Px>
	zoomWindow: SpanT<Px.Px>
	height: number
	getPointerPosition: (e: PointerEvent) => { x: number; y: number }
}

export function NavigatorRoot(handle: Handle<NavigatorRootContext>) {
	let containerEl: HTMLDivElement | null = null
	let size = { width: 0, height: 0 }

	const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot)

	handle.context.set({
		get size() {
			return size
		},
		get scale() {
			if (size.width === 0) return 1
			return Projection.scaleFor(
				Px.Numeric,
				rootCtx.timeline.size,
				Px.Px(size.width),
			)
		},
		get projection() {
			const timeline = rootCtx.timeline
			return makeProjection1D({
				N: Px.Numeric,
				timeline: {
					...timeline,
					view: Span.make(Px.Numeric, 0, timeline.size),
				},
				viewportWidthPx: Px.Px(size.width || 1),
			})
		},
		get zoomWindow() {
			const timeline = rootCtx.timeline
			const s =
				size.width === 0
					? 1
					: Projection.scaleFor(
							Px.Numeric,
							timeline.size,
							Px.Px(size.width),
						)
			return Span.transform(timeline.view, (v) =>
				Projection.toScreen(Px.Numeric, Px.Numeric.zero, v, s),
			)
		},
		get height() {
			return size.height
		},
		getPointerPosition(e: PointerEvent) {
			return getPointerPosition(e, containerEl)
		},
	})

	return (props: {
		children?: RemixNode
		height?: number
		class?: string
	}) => {
		const h = props.height ?? DEFAULT_HEIGHT

		return (
			<div
				connect={(node: HTMLDivElement, signal: AbortSignal) => {
					containerEl = node
					const observer = new ResizeObserver((entries) => {
						const entry = entries[0]
						if (entry) {
							size = {
								width: Math.round(entry.contentRect.width),
								height: Math.round(entry.contentRect.height),
							}
							handle.update()
						}
					})
					observer.observe(node)
					signal.addEventListener('abort', () => observer.disconnect())
				}}
				class={props.class}
				style={{ height: `${h}px` }}
			>
				{props.children}
			</div>
		)
	}
}
