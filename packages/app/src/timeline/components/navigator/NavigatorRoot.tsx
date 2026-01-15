import { useElementSize } from "@app/hooks/use-element-size";
import * as Point2D from "@app/lib/point-2d";
import { makeProjection1D } from "@app/timeline/foundation/projection1d";
import * as Projection from "@app/timeline/lib/projection";
import * as Px from "@app/timeline/lib/px";
import * as Span from "@app/timeline/lib/span";
import { getPointerPosition } from "@app/timeline/utils/get-pointer-position";
import * as React from "react";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import type { NavigatorContextValue } from "./NavigatorContext";
import { NavigatorContext } from "./NavigatorContext";

const DEFAULT_HEIGHT = 26;

export interface NavigatorRootProps {
	/** Children to render within the navigator context */
	children: React.ReactNode;
	/** Height of the navigator in pixels */
	height?: number;
	/** Optional className for the root element */
	className?: string;
}

/**
 * Navigator component that provides a minimap view of the timeline.
 * Renders a `<div>` element.
 */
export const NavigatorRoot = React.forwardRef<
	HTMLDivElement,
	NavigatorRootProps
>(function NavigatorRoot(props, forwardedRef) {
	const { children, height = DEFAULT_HEIGHT, className } = props;

	const { timeline } = useTimelineRootContext();
	const { ref: internalRef, size } = useElementSize<HTMLDivElement>();

	React.useImperativeHandle(forwardedRef, () => internalRef.current!, [
		internalRef,
	]);

	// Scale for navigator: maps full timeline size to element width
	const scale = React.useMemo(() => {
		if (size.width === 0) return 1;
		return Projection.scaleFor(Px.Numeric, timeline.size, Px.Px(size.width));
	}, [size.width, timeline.size]);

	// Projection for the navigator (full timeline as the view)
	const projection = React.useMemo(() => {
		return makeProjection1D({
			N: Px.Numeric,
			timeline: {
				...timeline,
				// Navigator shows the full timeline, view spans the whole thing
				view: Span.make(Px.Numeric, 0, timeline.size),
			},
			viewportWidthPx: Px.Px(size.width || 1),
		});
	}, [timeline, size.width]);

	// Transform view span to screen coordinates for the zoom window
	const zoomWindow = React.useMemo(
		() =>
			Span.transform(timeline.view, (v) =>
				Projection.toScreen(Px.Numeric, Px.Numeric.zero, v, scale),
			),
		[scale, timeline.view],
	);

	const getPointerPositionCallback = React.useCallback(
		(e: React.PointerEvent) =>
			Point2D.make(getPointerPosition(e, internalRef.current)),
		[internalRef],
	);

	const contextValue: NavigatorContextValue = React.useMemo(
		() => ({
			ref: internalRef,
			size,
			scale,
			projection,
			zoomWindow,
			height,
			getPointerPosition: getPointerPositionCallback,
		}),
		[
			internalRef,
			size,
			scale,
			projection,
			zoomWindow,
			height,
			getPointerPositionCallback,
		],
	);

	return (
		<NavigatorContext.Provider value={contextValue}>
			<div ref={internalRef} className={className} style={{ height }}>
				{children}
			</div>
		</NavigatorContext.Provider>
	);
});

export namespace NavigatorRoot {
	export type Props = NavigatorRootProps;
}
