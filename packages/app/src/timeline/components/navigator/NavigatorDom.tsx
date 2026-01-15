import type * as React from "react";
import type { SceneRenderer } from "../../renderers/types";
import { useTimelineRootContext } from "../root/TimelineRootContext";
import { TimelineDom } from "../shared/TimelineDom";
import { useNavigatorContext } from "./NavigatorContext";

// =============================================================================
// Types
// =============================================================================

export interface NavigatorDomProps<Data, UiState, Action> {
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
 * DOM overlay for the navigator that renders interactive timeline elements.
 * This is a thin wrapper around TimelineDom that pulls context from NavigatorContext.
 */
export function NavigatorDom<
	Data = Record<string, never>,
	UiState = Record<string, never>,
	Action = never,
>({
	renderer,
	data = {} as Data,
	ui = {} as UiState,
	dispatch,
	className,
}: NavigatorDomProps<Data, UiState, Action>): React.ReactElement {
	const { dpr } = useTimelineRootContext();
	const { size, projection, height } = useNavigatorContext();

	return (
		<TimelineDom
			dpr={dpr}
			projection={projection}
			size={size}
			height={height}
			surface="navigator"
			fitToHeight={true}
			renderer={renderer}
			data={data}
			ui={ui}
			dispatch={dispatch}
			className={className}
		/>
	);
}

export namespace NavigatorDom {
	export type Props<Data, UiState, Action> = NavigatorDomProps<
		Data,
		UiState,
		Action
	>;
}
