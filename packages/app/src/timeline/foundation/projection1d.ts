import type { Numeric } from "../lib/numeric";
import * as Projection from "../lib/projection";
import type * as Px from "../lib/px";
import type * as Span from "../lib/span";
import type * as Timeline from "../lib/timeline";

export type Projection1D<Unit extends number> = Readonly<{
	/** screen px / content unit */
	scale: number;
	/** Viewport width in screen pixels */
	viewportWidthPx: Px.Px;
	/** Full content size in content units */
	size: Unit;
	/** Current view span (start, size) */
	view: Span.Span<Unit>;

	/** Map a content-space position to a screen-space x (in px) relative to the viewport. */
	contentToScreenX: (x: Unit) => Px.Px;
	/** Map a screen-space x (in px) relative to the viewport into content-space. */
	screenToContentX: (x: Px.Px) => Unit;
}>;

export function makeProjection1D<Unit extends number>(args: {
	N: Numeric<Unit>;
	timeline: Timeline.Timeline<Unit>;
	viewportWidthPx: Px.Px;
}): Projection1D<Unit> {
	const { N, timeline, viewportWidthPx } = args;
	const scale = Projection.scaleFor(N, timeline.view.size, viewportWidthPx);
	const from = timeline.view.start;

	return {
		scale,
		viewportWidthPx,
		size: timeline.size,
		view: timeline.view,
		contentToScreenX: (x) => Projection.toScreen(N, from, x, scale),
		screenToContentX: (x) => Projection.fromScreen(N, from, x, scale),
	};
}
