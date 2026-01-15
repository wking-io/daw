import { useWheel } from "@app/hooks/use-wheel";
import * as Projection from "@app/timeline/lib/projection";
import * as Px from "@app/timeline/lib/px";
import * as Span from "@app/timeline/lib/span";
import * as Timeline from "@app/timeline/lib/timeline";
import { cn } from "@app/utils/cn";
import * as React from "react";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import { useNavigatorContext } from "./NavigatorContext";

type Idle = { kind: "idle" };
type Pan = {
	kind: "pan";
	initialTimeline: Timeline.Timeline<Px.Px>;
	offset: Px.Px;
};

type Interaction = Idle | Pan;

export interface NavigatorTrackProps {
	/** Zoom rate for wheel zoom interaction */
	zoomRate?: number;
	/** Children to render within the track (e.g., canvas, zoom window) */
	children: React.ReactNode;
	/** Optional className for styling */
	className?: string;
}

/**
 * The interactive background track of the navigator.
 * Handles click-to-snap and wheel-to-zoom behavior.
 * Renders a `<div>` element.
 */
export function NavigatorTrack({
	zoomRate = 350,
	children,
	className,
}: NavigatorTrackProps) {
	const { timeline, setTimeline, setIsInteracting } = useTimelineRootContext();
	const { ref, scale, getPointerPosition } = useNavigatorContext();
	const interactionRef = React.useRef<Interaction>({ kind: "idle" });

	// Wheel zoom
	useWheel(ref, (delta) => {
		const factor = factorFromDelta(delta, zoomRate);
		const nextTimeline = Timeline.zoomAt(
			Px.Numeric,
			timeline,
			factor,
			Span.center(Px.Numeric, timeline.view),
		);
		setTimeline(nextTimeline);
	});

	// Click to snap view to pointer position
	const handleSnap = (e: React.PointerEvent) => {
		if (!ref.current) return;
		e.preventDefault();

		ref.current.setPointerCapture(e.pointerId);
		const pointer = getPointerPosition(e);

		const offset = Px.divide(timeline.view.size, 2);
		const delta = deltaFrom({
			x: Px.Px(pointer.x),
			scale,
			offset,
			from: timeline.view.start,
		});
		const nextTimeline = Timeline.panBy(Px.Numeric, timeline, delta);
		setTimeline(nextTimeline);
		setIsInteracting(true);
		interactionRef.current = { kind: "pan", initialTimeline: timeline, offset };
	};

	const handlePan = (e: React.PointerEvent) => {
		if (
			interactionRef.current.kind !== "pan" ||
			!ref.current ||
			!ref.current.hasPointerCapture(e.pointerId)
		) {
			return;
		}

		ref.current.setPointerCapture(e.pointerId);
		const pointer = getPointerPosition(e);
		const delta = deltaFrom({
			scale,
			x: Px.Px(pointer.x),
			offset: interactionRef.current.offset,
			from: timeline.view.start,
		});
		const nextTimeline = Timeline.panBy(Px.Numeric, timeline, delta);
		setTimeline(nextTimeline);
	};

	const handleInteractionEnd = (e: React.PointerEvent) => {
		if (!ref.current || !ref.current.hasPointerCapture(e.pointerId)) {
			return;
		}
		ref.current.releasePointerCapture(e.pointerId);
		interactionRef.current = { kind: "idle" };
		setIsInteracting(false);
	};

	return (
		<div
			role="scrollbar"
			aria-controls="timeline-projection"
			aria-orientation="horizontal"
			aria-valuemin={0}
			aria-valuemax={timeline.size}
			aria-valuenow={timeline.view.start}
			tabIndex={-1}
			id="navigator-track"
			draggable={false}
			onDragStart={(e) => e.preventDefault()}
			onPointerDown={handleSnap}
			onPointerMove={handlePan}
			onPointerUp={handleInteractionEnd}
			className={cn(
				"timeline group relative h-full w-full overflow-hidden",
				className,
			)}
		>
			{children}
		</div>
	);
}

function deltaFrom({
	x,
	scale,
	offset,
	from,
}: {
	x: Px.Px;
	offset: Px.Px;
	scale: number;
	from?: Px.Px;
}): Px.Px {
	const N = Px.Numeric;
	// Convert screen position to timeline position (screen 0 = timeline 0 in navigator)
	const at = Projection.fromScreen(N, N.zero, x, scale);
	// nextStart = pointer timeline position - offset from zoom window edge
	const nextStart = N.subtract(at, offset);
	// delta = how much to move from current view.start
	return N.subtract(nextStart, from ?? N.zero);
}

function factorFromDelta(dy: number, rate = 350): number {
	return 2 ** (dy / rate);
}

export namespace NavigatorTrack {
	export type Props = NavigatorTrackProps;
}
