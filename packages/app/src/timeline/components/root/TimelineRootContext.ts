import * as React from "react";
import type * as Px from "../../lib/px";
import type * as Timeline from "../../lib/timeline";

export interface TimelineRootContextValue {
	/** The current timeline state */
	timeline: Timeline.Timeline<Px.Px>;
	/** Update the timeline state */
	setTimeline: (next: Timeline.Timeline<Px.Px>) => void;
	/** Whether any part of the timeline is being interacted with (drag, resize, etc.) */
	isInteracting: boolean;
	/** Set the interaction state */
	setIsInteracting: (isInteracting: boolean) => void;
	/** Device pixel ratio for canvas rendering */
	dpr: number;
}

export const TimelineRootContext = React.createContext<
	TimelineRootContextValue | undefined
>(undefined);

export function useTimelineRootContext(): TimelineRootContextValue {
	const context = React.useContext(TimelineRootContext);
	if (context === undefined) {
		throw new Error(
			"Timeline: TimelineRootContext is missing. Timeline parts must be placed within <Timeline.Root>.",
		);
	}
	return context;
}
