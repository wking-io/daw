import type { Projection1D } from "@app/timeline/foundation/projection1d";
import type * as Px from "@app/timeline/lib/px";
import type { TimelineHostEnv } from "@app/timeline/renderers/core";
import type { SceneRenderer } from "@app/timeline/renderers/types";
import { renderToDom } from "@app/timeline/scene";
import * as React from "react";

// =============================================================================
// Types
// =============================================================================

export interface TimelineDomProps<Data, UiState, Action> {
	/** Device pixel ratio */
	dpr: number;
	/** Projection for coordinate transforms */
	projection: Projection1D<Px.Px>;
	/** Canvas dimensions (used for env) */
	size: { width: number; height: number };
	/** Height */
	height: number;
	/** Surface type (main or navigator) */
	surface: "main" | "navigator";
	/** Whether to fit content to height */
	fitToHeight: boolean;
	/** The renderer to use */
	renderer: SceneRenderer<Data, UiState, Action>;
	/** Data to pass to the renderer */
	data: Data;
	/** UI state to pass to the renderer */
	ui: UiState;
	/** Dispatch function for actions */
	dispatch: (action: Action) => void;
	/** Optional className for styling */
	className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DOM overlay component for timeline rendering.
 * Renders interactive scene nodes (from scene.dom) as React elements.
 */
export function TimelineDom<Data, UiState, Action>({
	dpr,
	projection,
	size,
	height,
	surface,
	fitToHeight,
	renderer,
	data,
	ui,
	dispatch,
	className,
}: TimelineDomProps<Data, UiState, Action>): React.ReactElement {
	// Build the environment for the renderer
	const env: TimelineHostEnv = React.useMemo(
		() => ({
			canvas: {
				dpr,
				widthPx: size.width as Px.Px,
				heightPx: height as Px.Px,
			},
			surface,
			fitToHeight,
		}),
		[dpr, size.width, height, surface, fitToHeight],
	);

	// Build the scene
	const scene = React.useMemo(
		() => renderer.buildScene({ data, projection, ui, env }),
		[renderer, data, projection, ui, env],
	);

	// Render DOM nodes
	const domContent = React.useMemo(
		() => renderToDom(scene.dom, dispatch),
		[scene.dom, dispatch],
	);

	return (
		<div
			className={className}
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
			}}
		>
			{domContent}
		</div>
	);
}

export namespace TimelineDom {
	export type Props<Data, UiState, Action> = TimelineDomProps<
		Data,
		UiState,
		Action
	>;
}
