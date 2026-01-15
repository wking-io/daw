import { useElementSize } from "@app/hooks/use-element-size";
import * as Point2D from "@app/lib/point-2d";
import { makeProjection1D } from "@app/timeline/foundation/projection1d";
import * as Projection from "@app/timeline/lib/projection";
import * as Px from "@app/timeline/lib/px";
import * as Scroll from "@app/timeline/lib/scroll";
import * as Timeline from "@app/timeline/lib/timeline";
import { getPointerPosition } from "@app/timeline/utils/get-pointer-position";
import { cn } from "@app/utils/cn";
import * as React from "react";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import type { ProjectionContextValue } from "./ProjectionContext";
import { ProjectionContext } from "./ProjectionContext";

const DEFAULT_HEIGHT = 240;

export interface ProjectionRootProps {
	/** Children to render within the projection context */
	children: React.ReactNode;
	/** Height of the projection in pixels */
	height?: number;
	/** Optional className for the root element */
	className?: string;
}

/**
 * Projection component that provides the main scrollable view of the timeline.
 * Renders a scrollable `<div>` element.
 */
export const ProjectionRoot = React.forwardRef<
	HTMLDivElement,
	ProjectionRootProps
>(function ProjectionRoot(props, forwardedRef) {
	const { children, height = DEFAULT_HEIGHT, className } = props;

	const { timeline, setTimeline, isInteracting } = useTimelineRootContext();
	const { ref: internalRef, size } = useElementSize<HTMLDivElement>();
	const suppressScrollEventsRef = React.useRef(false);

	React.useImperativeHandle(forwardedRef, () => internalRef.current!, [
		internalRef,
	]);

	// Scale for projection: maps view size to element width
	const scale = React.useMemo(() => {
		if (size.width === 0) return 1;
		return Projection.scaleFor(
			Px.Numeric,
			timeline.view.size,
			Px.Px(size.width),
		);
	}, [size.width, timeline.view.size]);

	// Projection for the main view
	const projection = React.useMemo(() => {
		return makeProjection1D({
			N: Px.Numeric,
			timeline,
			viewportWidthPx: Px.Px(size.width || 1),
		});
	}, [timeline, size.width]);

	// Total scrollable content width
	const contentWidth = React.useMemo(() => {
		return Scroll.width(Px.Numeric, timeline.size, scale);
	}, [timeline.size, scale]);

	// State → DOM: sync scroll position when timeline changes (unless interacting)
	React.useEffect(() => {
		if (!internalRef.current || isInteracting) return;

		const nextScrollLeft = Scroll.toScroll(
			Px.Numeric,
			timeline.view.start,
			scale,
		);

		if (Math.abs(internalRef.current.scrollLeft - nextScrollLeft) < 0.5) return;

		suppressScrollEventsRef.current = true;
		internalRef.current.scrollLeft = nextScrollLeft;
		requestAnimationFrame(() => {
			suppressScrollEventsRef.current = false;
		});
	}, [scale, timeline.view.start, isInteracting, internalRef]);

	// DOM → State: native scroll updates view.start
	const onScroll = React.useCallback(
		(_: React.UIEvent<HTMLDivElement>) => {
			if (suppressScrollEventsRef.current || !internalRef.current) return;

			const nextStart = Scroll.fromScroll(
				Px.Numeric,
				Px.Px(internalRef.current.scrollLeft),
				scale,
			);

			const nextTimeline = Timeline.panBy(
				Px.Numeric,
				timeline,
				Px.subtract(nextStart, timeline.view.start),
			);

			setTimeline(nextTimeline);
		},
		[scale, timeline, setTimeline, internalRef],
	);

	const getPointerPositionCallback = React.useCallback(
		(e: React.PointerEvent) =>
			Point2D.make(getPointerPosition(e, internalRef.current)),
		[internalRef],
	);

	const contextValue: ProjectionContextValue = React.useMemo(
		() => ({
			ref: internalRef,
			size,
			scale,
			projection,
			contentWidth,
			height,
			getPointerPosition: getPointerPositionCallback,
		}),
		[
			internalRef,
			size,
			scale,
			projection,
			contentWidth,
			height,
			getPointerPositionCallback,
		],
	);

	return (
		<ProjectionContext.Provider value={contextValue}>
			<div
				id="timeline-projection"
				ref={internalRef}
				onScroll={onScroll}
				className={cn(
					"no-scrollbar timeline relative overflow-x-auto overflow-y-hidden",
					className,
				)}
				style={{
					height,
					overscrollBehaviorX: "none",
				}}
			>
				{/* Spacer defines scroll range */}
				<div className="h-0" style={{ width: Math.max(1, contentWidth) }} />
				{/* Content container */}
				<div
					className="pointer-events-none sticky top-0 left-0"
					style={{
						width: size.width || "100%",
						height,
					}}
				>
					{children}
				</div>
			</div>
		</ProjectionContext.Provider>
	);
});

export namespace ProjectionRoot {
	export type Props = ProjectionRootProps;
}
