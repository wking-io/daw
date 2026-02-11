import type { Handle } from '@remix-run/component'
import { cn } from '@daw/utils'

import * as Projection from '../lib/projection'
import * as Px from '../lib/px'
import * as Span from '../lib/span'
import * as Timeline from '../lib/timeline'
import { NavigatorRoot } from './navigator-root'
import type { NavigatorRootContext } from './navigator-root'
import { TimelineRoot } from './timeline-root'
import type { TimelineRootContext } from './timeline-root'

type Direction = 'L' | 'R'
type Idle = { kind: 'idle' }
type Pan<A extends number> = {
	kind: 'pan'
	initialTimeline: Timeline.Timeline<A>
	offset: A
}
type Resize<A extends number> = {
	kind: 'resize'
	initialTimeline: Timeline.Timeline<A>
	direction: Direction
}
type Zoom<A extends number> = {
	kind: 'zoom'
	initialTimeline: Timeline.Timeline<A>
}

type Interaction<A extends number> = Idle | Pan<A> | Resize<A> | Zoom<A>

// WebKit shows a disruptive message with pointer lock, so we skip it
const isWebKit =
	typeof navigator !== 'undefined' &&
	/^((?!chrome|android).)*safari/i.test(navigator.userAgent)

export function ZoomWindow(handle: Handle) {
	const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot)
	const navCtx: NavigatorRootContext = handle.context.get(NavigatorRoot)
	let windowEl: HTMLDivElement | null = null
	let isAltKeyPressed = false
	let interaction: Interaction<Px.Px> = { kind: 'idle' }

	// Scrub state
	let isScrubbing = false
	let cumulativeDelta = 0

	// Track Alt key globally
	handle.on(window, {
		keydown(e: KeyboardEvent) {
			if (e.key === 'Alt') {
				isAltKeyPressed = true
				handle.update()
			}
		},
		keyup(e: KeyboardEvent) {
			if (e.key === 'Alt') {
				isAltKeyPressed = false
				handle.update()
			}
		},
	})

	// Scrub handlers (inline version of useScrub)
	function handleScrubMove(event: PointerEvent) {
		if (!isScrubbing) return
		event.preventDefault()
		cumulativeDelta += event.movementY

		// Handle zoom
		if (interaction.kind !== 'zoom') return
		const { initialTimeline } = interaction
		const factor = factorFromDelta(cumulativeDelta, 350)
		const nextTimeline = Timeline.zoomAt(
			Px.Numeric,
			initialTimeline,
			factor,
			Span.center(Px.Numeric, initialTimeline.view),
		)
		rootCtx.setTimeline(nextTimeline)
	}

	function handleScrubUp() {
		if (!isScrubbing) return
		isScrubbing = false

		if (document.pointerLockElement) {
			document.exitPointerLock()
		}

		if (interaction.kind === 'zoom') {
			interaction = { kind: 'idle' }
			rootCtx.setIsInteracting(false)
		}

		window.removeEventListener('pointermove', handleScrubMove, true)
		window.removeEventListener('pointerup', handleScrubUp, true)
	}

	async function handleScrubStart(event: PointerEvent) {
		const isMainButton = event.button === 0
		if (!isMainButton || event.defaultPrevented) return
		event.preventDefault()
		event.stopPropagation()

		cumulativeDelta = 0
		isScrubbing = true

		// Start zoom interaction
		interaction = { kind: 'zoom', initialTimeline: rootCtx.timeline }
		rootCtx.setIsInteracting(true)

		window.addEventListener('pointermove', handleScrubMove, true)
		window.addEventListener('pointerup', handleScrubUp, true)

		if (!isWebKit) {
			try {
				await document.body.requestPointerLock()
			} catch {
				// Pointer lock denied, continue without it
			}
		}
	}

	return (props: { zoomRate?: number; class?: string }) => {
		const zoomWindow = navCtx.zoomWindow

		function handlePanStart(e: PointerEvent) {
			if (!navCtx.containerEl || !windowEl) return
			e.preventDefault()
			e.stopPropagation()

			windowEl.setPointerCapture(e.pointerId)
			const pointer = navCtx.getPointerPosition(e)
			const offset = deltaFrom({
				x: Px.Px(pointer.x),
				scale: navCtx.scale,
				offset: rootCtx.timeline.view.start,
			})
			rootCtx.setIsInteracting(true)
			interaction = {
				kind: 'pan',
				initialTimeline: rootCtx.timeline,
				offset,
			}
		}

		function handlePan(e: PointerEvent) {
			if (
				interaction.kind !== 'pan' ||
				!navCtx.containerEl ||
				!windowEl ||
				!windowEl.hasPointerCapture(e.pointerId)
			) {
				return
			}

			const pointer = navCtx.getPointerPosition(e)
			const delta = deltaFrom({
				scale: navCtx.scale,
				x: Px.Px(pointer.x),
				offset: interaction.offset,
				from: rootCtx.timeline.view.start,
			})
			const nextTimeline = Timeline.panBy(
				Px.Numeric,
				rootCtx.timeline,
				delta,
			)
			rootCtx.setTimeline(nextTimeline)
		}

		function handleInteractionEnd(e: PointerEvent) {
			if (!windowEl || !windowEl.hasPointerCapture(e.pointerId)) {
				return
			}
			windowEl.releasePointerCapture(e.pointerId)
			interaction = { kind: 'idle' }
			rootCtx.setIsInteracting(false)
		}

		function handleResizeStart(direction: Direction) {
			return (e: PointerEvent) => {
				if (!navCtx.containerEl || !windowEl) return
				e.preventDefault()
				e.stopPropagation()

				windowEl.setPointerCapture(e.pointerId)
				interaction = {
					kind: 'resize',
					direction,
					initialTimeline: rootCtx.timeline,
				}
			}
		}

		function handleResize(e: PointerEvent) {
			if (
				interaction.kind !== 'resize' ||
				!navCtx.containerEl ||
				!windowEl ||
				!windowEl.hasPointerCapture(e.pointerId)
			) {
				return
			}

			const pointer = navCtx.getPointerPosition(e)
			const pointerTimelinePos = Projection.fromScreen(
				Px.Numeric,
				Px.Numeric.zero,
				Px.Px(pointer.x),
				navCtx.scale,
			)

			if (interaction.direction === 'L') {
				const delta = Px.subtract(
					pointerTimelinePos,
					rootCtx.timeline.view.start,
				)
				const nextTimeline = Timeline.resizeLeftBy(
					Px.Numeric,
					rootCtx.timeline,
					delta,
				)
				rootCtx.setTimeline(nextTimeline)
			} else {
				const delta = Px.subtract(
					pointerTimelinePos,
					Span.end(Px.Numeric, rootCtx.timeline.view),
				)
				const nextTimeline = Timeline.resizeRightBy(
					Px.Numeric,
					rootCtx.timeline,
					delta,
				)
				rootCtx.setTimeline(nextTimeline)
			}
		}

		function handlePickMoveEvent(e: PointerEvent) {
			return interaction.kind === 'resize'
				? handleResize(e)
				: handlePan(e)
		}

		return (
			<div
				connect={(node: HTMLDivElement) => {
					windowEl = node
				}}
				data-zoom-window
				draggable={false}
				on={{
					pointerdown: isAltKeyPressed
						? handleScrubStart
						: handlePanStart,
					pointermove: handlePickMoveEvent,
					pointerup: handleInteractionEnd,
				}}
				class={cn(
					'group/zoom-window absolute top-0 bottom-0 rounded-[3px] border border-neutral-400 group-data-active:border-neutral-300 hover:border-neutral-300',
					isAltKeyPressed ? 'cursor-zoom-out' : 'cursor-move',
					props.class,
				)}
				style={{
					left: `${zoomWindow.start}px`,
					width: `${zoomWindow.size}px`,
				}}
			>
				{/* Left resize handle */}
				<div
					data-zoom-handle
					on={{ pointerdown: handleResizeStart('L') }}
					class="absolute top-0 bottom-0 -left-1 w-2.5 cursor-ew-resize"
				>
					<div class="absolute top-1/2 left-1 h-3/4 w-0.5 -translate-y-1/2 rounded-r-[2px] group-hover/zoom-window:bg-neutral-300" />
				</div>
				{/* Right resize handle */}
				<div
					data-zoom-handle
					on={{ pointerdown: handleResizeStart('R') }}
					class="absolute top-0 -right-1 bottom-0 w-2.5 cursor-ew-resize"
				>
					<div class="absolute top-1/2 right-1 h-3/4 w-0.5 -translate-y-1/2 rounded-l-[2px] group-hover/zoom-window:bg-neutral-300" />
				</div>
			</div>
		)
	}
}

function deltaFrom({
	x,
	scale,
	offset,
	from,
}: {
	x: Px.Px
	offset: Px.Px
	scale: number
	from?: Px.Px
}): Px.Px {
	const N = Px.Numeric
	const at = Projection.fromScreen(N, N.zero, x, scale)
	const nextStart = N.subtract(at, offset)
	return N.subtract(nextStart, from ?? N.zero)
}

function factorFromDelta(dy: number, rate = 350): number {
	return Math.pow(2, -dy / rate)
}
