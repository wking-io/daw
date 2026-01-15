import type { SceneRenderer } from "../../renderers/types";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import { TimelineCanvas } from "../shared/TimelineCanvas";
import { useNavigatorContext } from "./NavigatorContext";

// =============================================================================
// Types
// =============================================================================

export interface NavigatorCanvasProps<Data, UiState, Action> {
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
 * Canvas layer for the navigator that renders timeline content.
 * This is a thin wrapper around TimelineCanvas that pulls context from NavigatorContext.
 */
export function NavigatorCanvas<
	Data = Record<string, never>,
	UiState = Record<string, never>,
	Action = never,
>({
	renderer,
	data = {} as Data,
	ui = {} as UiState,
	className,
}: NavigatorCanvasProps<Data, UiState, Action>): React.ReactElement {
	const { dpr } = useTimelineRootContext();
	const { size, projection, height } = useNavigatorContext();

	return (
		<TimelineCanvas
			dpr={dpr}
			projection={projection}
			size={size}
			height={height}
			surface="navigator"
			fitToHeight={true}
			renderer={renderer}
			data={data}
			ui={ui}
			className={className}
		/>
	);
}

export namespace NavigatorCanvas {
	export type Props<Data, UiState, Action> = NavigatorCanvasProps<
		Data,
		UiState,
		Action
	>;
}
