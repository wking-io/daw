import { cn } from "@app/utils/cn";
import type * as React from "react";
import type { SceneRenderer } from "../../renderers/types";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import { TimelineDom } from "../shared/TimelineDom";
import { useProjectionContext } from "./ProjectionContext";

// =============================================================================
// Types
// =============================================================================

export interface ProjectionDomProps<Data, UiState, Action> {
	/** The scene renderer to use */
	renderer: SceneRenderer<Data, UiState, Action>;
	/** Data to pass to the renderer */
	data?: Data;
	/** UI state to pass to the renderer */
	ui?: UiState;
	/** Dispatch function for actions */
	dispatch: (action: Action) => void;
	/** Optional className for styling */
	className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DOM overlay for the projection that renders interactive timeline elements.
 * This is a thin wrapper around TimelineDom that pulls context from ProjectionContext.
 */
export function ProjectionDom<
	Data = Record<string, never>,
	UiState = Record<string, never>,
	Action = never,
>({
	renderer,
	data = {} as Data,
	ui = {} as UiState,
	dispatch,
	className,
}: ProjectionDomProps<Data, UiState, Action>): React.ReactElement {
	const { dpr } = useTimelineRootContext();
	const { size, projection, height } = useProjectionContext();

	return (
		<TimelineDom
			dpr={dpr}
			projection={projection}
			size={size}
			height={height}
			surface="main"
			fitToHeight={true}
			renderer={renderer}
			data={data}
			ui={ui}
			dispatch={dispatch}
			className={cn(className, "pointer-events-auto")}
		/>
	);
}

export namespace ProjectionDom {
	export type Props<Data, UiState, Action> = ProjectionDomProps<
		Data,
		UiState,
		Action
	>;
}
