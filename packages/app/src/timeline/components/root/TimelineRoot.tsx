import type * as Px from "@app/timeline/lib/px";
import type * as Timeline from "@app/timeline/lib/timeline";
import * as React from "react";
import type { TimelineRootContextValue } from "./TimelineRootContext";
import { TimelineRootContext } from "./TimelineRootContext";

export interface TimelineRootProps {
	/** The current timeline state (controlled) */
	timeline: Timeline.Timeline<Px.Px>;
	/** Callback when timeline state changes */
	setTimeline: (next: Timeline.Timeline<Px.Px>) => void;
	/** Children to render within the timeline context */
	children: React.ReactNode;
	/** Optional className for the root element */
	className?: string;
}

/**
 * Root component that provides timeline state to all child components.
 * Renders a `<div>` element.
 */
export const TimelineRoot = React.forwardRef<HTMLDivElement, TimelineRootProps>(
	function TimelineRoot(props, forwardedRef) {
		const { timeline, setTimeline, children, className } = props;

		const [isInteracting, setIsInteracting] = React.useState(false);

		const dpr = React.useMemo(() => {
			if (typeof window === "undefined") return 1;
			return window.devicePixelRatio || 1;
		}, []);

		const contextValue: TimelineRootContextValue = React.useMemo(
			() => ({
				timeline,
				setTimeline,
				isInteracting,
				setIsInteracting,
				dpr,
			}),
			[timeline, setTimeline, isInteracting, dpr],
		);

		return (
			<TimelineRootContext.Provider value={contextValue}>
				<div ref={forwardedRef} className={className}>
					{children}
				</div>
			</TimelineRootContext.Provider>
		);
	},
);

export namespace TimelineRoot {
	export type Props = TimelineRootProps;
}
