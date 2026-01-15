import type { Size } from "@app/hooks/use-element-size";
import type * as Point2D from "@app/lib/point-2d";
import type { Projection1D } from "@app/timeline/foundation/projection1d";
import type * as Px from "@app/timeline/lib/px";
import * as React from "react";

export interface ProjectionContextValue {
	/** Ref to the projection scroll container element */
	ref: React.RefObject<HTMLDivElement | null>;
	/** Element dimensions */
	size: Size;
	/** Scale factor: view size → element width */
	scale: number;
	/** Projection for mapping content ↔ screen coordinates */
	projection: Projection1D<Px.Px>;
	/** Total scrollable content width in screen pixels */
	contentWidth: number;
	/** Height of the projection in pixels */
	height: number;
	/** Get pointer position relative to the projection container */
	getPointerPosition: (e: React.PointerEvent) => Point2D.Point2D;
}

export const ProjectionContext = React.createContext<
	ProjectionContextValue | undefined
>(undefined);

export function useProjectionContext(): ProjectionContextValue {
	const context = React.useContext(ProjectionContext);
	if (context === undefined) {
		throw new Error(
			"Timeline: ProjectionContext is missing. Projection parts must be placed within <Timeline.Projection>.",
		);
	}
	return context;
}
