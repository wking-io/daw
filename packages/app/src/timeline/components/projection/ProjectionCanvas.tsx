import type * as React from "react";
import type { SceneRenderer } from "../../renderers/types";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import { TimelineCanvas } from "../shared/TimelineCanvas";
import { useProjectionContext } from "./ProjectionContext";

// =============================================================================
// Types
// =============================================================================

export interface ProjectionCanvasProps<Data, UiState, Action> {
	/** The scene renderer to use for drawing */
	renderer: SceneRenderer<Data, UiState, Action>;
	/** Data to pass to the renderer */
	data?: Data;
	/** UI state to pass to the renderer */
	ui?: UiState;
	/** Optional className for styling */
	className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Canvas layer for the projection that renders timeline content.
 * This is a thin wrapper around TimelineCanvas that pulls context from ProjectionContext.
 */
export function ProjectionCanvas<
	Data = Record<string, never>,
	UiState = Record<string, never>,
	Action = never,
>({
	renderer,
	data = {} as Data,
	ui = {} as UiState,
	className,
}: ProjectionCanvasProps<Data, UiState, Action>): React.ReactElement {
	const { dpr } = useTimelineRootContext();
	const { size, projection, height } = useProjectionContext();

	return (
		<TimelineCanvas
			dpr={dpr}
			projection={projection}
			size={size}
			height={height}
			surface="main"
			fitToHeight={true}
			renderer={renderer}
			data={data}
			ui={ui}
			className={className}
		/>
	);
}

export namespace ProjectionCanvas {
	export type Props<Data, UiState, Action> = ProjectionCanvasProps<
		Data,
		UiState,
		Action
	>;
}
