import type * as Point2D from "@app/lib/point-2d";
import * as React from "react";
import type { Size } from "../../../hooks/use-element-size";
import type { Projection1D } from "../../foundation/projection1d";
import type * as Px from "../../lib/px";
import type * as Span from "../../lib/span";

export interface NavigatorContextValue {
	/** Ref to the navigator container element */
	ref: React.RefObject<HTMLDivElement | null>;
	/** Element dimensions */
	size: Size;
	/** Scale factor: full timeline size → element width */
	scale: number;
	/** Projection for mapping content ↔ screen coordinates */
	projection: Projection1D<Px.Px>;
	/** The view span transformed to screen coordinates */
	zoomWindow: Span.Span<Px.Px>;
	/** Height of the navigator in pixels */
	height: number;
	/** Get pointer position relative to the navigator container */
	getPointerPosition: (e: React.PointerEvent) => Point2D.Point2D;
}

export const NavigatorContext = React.createContext<
	NavigatorContextValue | undefined
>(undefined);

export function useNavigatorContext(): NavigatorContextValue {
	const context = React.useContext(NavigatorContext);
	if (context === undefined) {
		throw new Error(
			"Timeline: NavigatorContext is missing. Navigator parts must be placed within <Timeline.Navigator>.",
		);
	}
	return context;
}
