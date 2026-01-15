import * as React from 'react'

import { cn } from '@app/utils/cn'
import { useGlobalKeyPressed } from '@app/hooks/use-global-key-pressed'
import { useScrub } from '@app/hooks/use-scrub'
import * as Projection from '@app/timeline/lib/projection'
import * as Px from '@app/timeline/lib/px'
import * as Span from '../../lib/span'
import * as Timeline from '../../lib/timeline'
import { useTimelineRootContext } from '../root/TimelineRootContext'
import { useNavigatorContext } from './NavigatorContext'

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

export interface ZoomWindowProps {
	/** Zoom rate for alt+drag zoom interaction */
	zoomRate?: number
	/** Optional className for styling */
	className?: string
}

/**
 * The draggable zoom window within the navigator.
 * Renders a `<div>` element.
 */
export function ZoomWindow({ zoomRate = 350, className }: ZoomWindowProps) {
	const { timeline, setTimeline, setIsInteracting } = useTimelineRootContext()
	const {
		ref: navigatorRef,
		scale,
		zoomWindow,
		getPointerPosition,
	} = useNavigatorContext()
	const windowRef = React.useRef<HTMLDivElement>(null)
	const isAltKeyPressed = useGlobalKeyPressed('Alt')
	const interactionRef = React.useRef<Interaction<Px.Px>>({ kind: 'idle' })

	const handleZoomStart = () => {
		interactionRef.current = { kind: 'zoom', initialTimeline: timeline }
		setIsInteracting(true)
	}

	const handleZoom = (delta: number) => {
		if (interactionRef.current.kind !== 'zoom') return
		const { initialTimeline } = interactionRef.current
		const factor = factorFromDelta(delta, zoomRate)
		const nextTimeline = Timeline.zoomAt(
			Px.Numeric,
			initialTimeline,
			factor,
			Span.center(Px.Numeric, initialTimeline.view),
		)
		setTimeline(nextTimeline)
	}

	const handleZoomEnd = () => {
		if (interactionRef.current.kind !== 'zoom') return
		interactionRef.current = { kind: 'idle' }
		setIsInteracting(false)
	}

	const handleScrubStart = useScrub({
		onScrubStart: handleZoomStart,
		onScrub: handleZoom,
		onScrubEnd: handleZoomEnd,
	})

	const handlePanStart = (e: React.PointerEvent) => {
		if (!navigatorRef.current || !windowRef.current) return
		e.preventDefault()
		e.stopPropagation()

		windowRef.current.setPointerCapture(e.pointerId)
		const pointer = getPointerPosition(e)
		const offset = deltaFrom({
			x: Px.Px(pointer.x),
			scale,
			offset: timeline.view.start,
		})
		setIsInteracting(true)
		interactionRef.current = { kind: 'pan', initialTimeline: timeline, offset }
	}

	const handlePan = (e: React.PointerEvent) => {
		if (
			interactionRef.current.kind !== 'pan' ||
			!navigatorRef.current ||
			!windowRef.current ||
			!windowRef.current.hasPointerCapture(e.pointerId)
		) {
			return
		}

		const pointer = getPointerPosition(e)
		const delta = deltaFrom({
			scale,
			x: Px.Px(pointer.x),
			offset: interactionRef.current.offset,
			from: timeline.view.start,
		})
		const nextTimeline = Timeline.panBy(Px.Numeric, timeline, delta)
		setTimeline(nextTimeline)
	}

	const handleInteractionEnd = (e: React.PointerEvent) => {
		if (
			!windowRef.current ||
			!windowRef.current.hasPointerCapture(e.pointerId)
		) {
			return
		}
		windowRef.current.releasePointerCapture(e.pointerId)
		interactionRef.current = { kind: 'idle' }
		setIsInteracting(false)
	}

	const handleResizeStart =
		(direction: Direction) => (e: React.PointerEvent) => {
			if (!navigatorRef.current || !windowRef.current) return
			e.preventDefault()
			e.stopPropagation()

			windowRef.current.setPointerCapture(e.pointerId)
			interactionRef.current = {
				kind: 'resize',
				direction,
				initialTimeline: timeline,
			}
		}

	const handleResize = (e: React.PointerEvent) => {
		if (
			interactionRef.current.kind !== 'resize' ||
			!navigatorRef.current ||
			!windowRef.current ||
			!windowRef.current.hasPointerCapture(e.pointerId)
		) {
			return
		}

		const pointer = getPointerPosition(e)

		// Convert screen position to timeline position
		const pointerTimelinePos = Projection.fromScreen(
			Px.Numeric,
			Px.Numeric.zero,
			Px.Px(pointer.x),
			scale,
		)

		if (interactionRef.current.direction === 'L') {
			const delta = Px.subtract(pointerTimelinePos, timeline.view.start)
			const nextTimeline = Timeline.resizeLeftBy(Px.Numeric, timeline, delta)
			setTimeline(nextTimeline)
		} else {
			const delta = Px.subtract(
				pointerTimelinePos,
				Span.end(Px.Numeric, timeline.view),
			)
			const nextTimeline = Timeline.resizeRightBy(Px.Numeric, timeline, delta)
			setTimeline(nextTimeline)
		}
	}

	const handlePickMoveEvent = (e: React.PointerEvent) =>
		interactionRef.current.kind === 'resize' ? handleResize(e) : handlePan(e)

	return (
		<div
			ref={windowRef}
			data-zoom-window
			draggable={false}
			onPointerDown={isAltKeyPressed ? handleScrubStart : handlePanStart}
			onPointerMove={handlePickMoveEvent}
			onPointerUp={handleInteractionEnd}
			className={cn(
				'group/zoom-window absolute top-0 bottom-0 rounded-[3px] border border-neutral-400 group-data-active:border-neutral-300 hover:border-neutral-300',
				isAltKeyPressed ? 'cursor-zoom-out' : 'cursor-move',
				className,
			)}
			style={{
				left: zoomWindow.start,
				width: zoomWindow.size,
			}}
		>
			{/* Left resize handle */}
			<div
				data-zoom-handle
				onPointerDown={handleResizeStart('L')}
				className="absolute top-0 bottom-0 -left-1 w-2.5 cursor-ew-resize"
			>
				<div className="absolute top-1/2 left-1 h-3/4 w-0.5 -translate-y-1/2 rounded-r-[2px] group-hover/zoom-window:bg-neutral-300" />
			</div>
			{/* Right resize handle */}
			<div
				data-zoom-handle
				onPointerDown={handleResizeStart('R')}
				className="absolute top-0 -right-1 bottom-0 w-2.5 cursor-ew-resize"
			>
				<div className="absolute top-1/2 right-1 h-3/4 w-0.5 -translate-y-1/2 rounded-l-[2px] group-hover/zoom-window:bg-neutral-300" />
			</div>
		</div>
	)
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
	// Convert screen position to timeline position (screen 0 = timeline 0 in navigator)
	const at = Projection.fromScreen(N, N.zero, x, scale)
	// nextStart = pointer timeline position - offset from zoom window edge
	const nextStart = N.subtract(at, offset)
	// delta = how much to move from current view.start
	return N.subtract(nextStart, from ?? N.zero)
}

function factorFromDelta(dy: number, rate = 350): number {
	return Math.pow(2, -dy / rate)
}

export namespace ZoomWindow {
	export type Props = ZoomWindowProps
}
