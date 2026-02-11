import type { Handle, RemixNode } from '@remix-run/component'
import { cn } from '@daw/utils'

import { makeProjection1D } from '../foundation/projection1d'
import type { Projection1D } from '../foundation/projection1d'
import * as Projection from '../lib/projection'
import * as Px from '../lib/px'
import * as Scroll from '../lib/scroll'
import * as Timeline from '../lib/timeline'
import { getPointerPosition } from '../utils/get-pointer-position'
import { TimelineRoot } from './timeline-root'
import type { TimelineRootContext } from './timeline-root'

const DEFAULT_HEIGHT = 240

export type ProjectionRootContext = {
	containerEl: HTMLDivElement | null
	size: { width: number; height: number }
	scale: number
	projection: Projection1D<Px.Px>
	contentWidth: number
	height: number
	getPointerPosition: (e: PointerEvent) => { x: number; y: number }
}

export function ProjectionRoot(handle: Handle<ProjectionRootContext>) {
	const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot)
	let containerEl: HTMLDivElement | null = null
	let size = { width: 0, height: 0 }
	let suppressScrollEvents = false

	handle.context.set({
		get containerEl() {
			return containerEl
		},
		get size() {
			return size
		},
		get scale() {
			if (size.width === 0) return 1
			return Projection.scaleFor(
				Px.Numeric,
				rootCtx.timeline.view.size,
				Px.Px(size.width),
			)
		},
		get projection() {
			return makeProjection1D({
				N: Px.Numeric,
				timeline: rootCtx.timeline,
				viewportWidthPx: Px.Px(size.width || 1),
			})
		},
		get contentWidth() {
			const s =
				size.width === 0
					? 1
					: Projection.scaleFor(
							Px.Numeric,
							rootCtx.timeline.view.size,
							Px.Px(size.width),
						)
			return Scroll.width(Px.Numeric, rootCtx.timeline.size, s)
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

		// Compute current scale and contentWidth for this render
		const scale =
			size.width === 0
				? 1
				: Projection.scaleFor(
						Px.Numeric,
						rootCtx.timeline.view.size,
						Px.Px(size.width),
					)
		const contentWidth = Scroll.width(
			Px.Numeric,
			rootCtx.timeline.size,
			scale,
		)

		// State → DOM: sync scroll position after render
		handle.queueTask(() => {
			if (!containerEl || rootCtx.isInteracting) return

			const nextScrollLeft = Scroll.toScroll(
				Px.Numeric,
				rootCtx.timeline.view.start,
				scale,
			)

			if (Math.abs(containerEl.scrollLeft - nextScrollLeft) < 0.5) return

			suppressScrollEvents = true
			containerEl.scrollLeft = nextScrollLeft
			requestAnimationFrame(() => {
				suppressScrollEvents = false
			})
		})

		function onScroll() {
			if (suppressScrollEvents || !containerEl) return

			const nextStart = Scroll.fromScroll(
				Px.Numeric,
				Px.Px(containerEl.scrollLeft),
				scale,
			)

			const nextTimeline = Timeline.panBy(
				Px.Numeric,
				rootCtx.timeline,
				Px.subtract(nextStart, rootCtx.timeline.view.start),
			)

			rootCtx.setTimeline(nextTimeline)
		}

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

					node.addEventListener('scroll', onScroll, { signal })
				}}
				class={cn(
					'no-scrollbar timeline relative overflow-x-auto overflow-y-hidden',
					props.class,
				)}
				style={{
					height: `${h}px`,
					overscrollBehaviorX: 'none',
				}}
			>
				{/* Spacer defines scroll range */}
				<div
					class="h-0"
					style={{ width: `${Math.max(1, contentWidth)}px` }}
				/>
				{/* Content container */}
				<div
					class="pointer-events-none sticky top-0 left-0"
					style={{
						width: size.width ? `${size.width}px` : '100%',
						height: `${h}px`,
					}}
				>
					{props.children}
				</div>
			</div>
		)
	}
}
