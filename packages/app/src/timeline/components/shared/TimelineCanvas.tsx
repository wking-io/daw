import { useIsomorphicLayoutEffect } from "@app/hooks/use-isomorphic-layout-effect";
import { prepareCanvas } from "@app/lib/canvas";
import type { Projection1D } from "@app/timeline/foundation/projection1d";
import type * as Px from "@app/timeline/lib/px";
import type { TimelineHostEnv } from "@app/timeline/renderers/core";
import type { SceneRenderer } from "@app/timeline/renderers/types";
import { renderToCanvas } from "@app/timeline/scene";
import * as React from "react";

// =============================================================================
// Types
// =============================================================================

export type TimelineCanvasContextValue = Readonly<{
	projection: Projection1D<Px.Px>;
	size: { width: number; height: number };
	height: number;
}>;

export interface TimelineCanvasProps<Data, UiState, Action> {
	/** Device pixel ratio */
	dpr: number;
	/** Projection for coordinate transforms */
	projection: Projection1D<Px.Px>;
	/** Canvas dimensions */
	size: { width: number; height: number };
	/** Canvas height */
	height: number;
	/** Surface type (main or navigator) */
	surface: "main" | "navigator";
	/** Whether to fit content to height */
	fitToHeight: boolean;
	/** The renderer to use for drawing */
	renderer: SceneRenderer<Data, UiState, Action>;
	/** Data to pass to the renderer */
	data: Data;
	/** UI state to pass to the renderer */
	ui: UiState;
	/** Optional className for styling */
	className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Unified canvas component for timeline rendering.
 * Supports scene graph renderers.
 */
export function TimelineCanvas<Data, UiState, Action>({
	dpr,
	projection,
	size,
	height,
	surface,
	fitToHeight,
	renderer,
	data,
	ui,
	className,
}: TimelineCanvasProps<Data, UiState, Action>): React.ReactElement {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);

	// Build the environment for the renderer
	const env: TimelineHostEnv = React.useMemo(
		() => ({
			canvas: {
				dpr,
				widthPx: size.width as Px.Px,
				heightPx: size.height as Px.Px,
			},
			surface,
			fitToHeight,
		}),
		[dpr, size.width, height, surface, fitToHeight],
	);

	// Draw to canvas
	useIsomorphicLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = prepareCanvas({
			canvas,
			cssW: Math.max(1, size.width),
			cssH: height,
			dpr,
		});
		if (!ctx) return;

		// Scene graph renderer - build scene and use canvas adapter
		const scene = renderer.buildScene({ data, projection, ui, env });
		renderToCanvas(ctx, scene.canvas);
	}, [dpr, size.width, height, renderer, data, projection, ui, env]);

	return (
		<canvas
			ref={canvasRef}
			draggable={false}
			className={className}
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
			}}
		/>
	);
}

export namespace TimelineCanvas {
	export type Props<Data, UiState, Action> = TimelineCanvasProps<
		Data,
		UiState,
		Action
	>;
}
