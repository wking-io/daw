import * as Px from "@daw/core/lib/px";
import type { ProjectionContext } from "../lib/projection-context";

export type TimelineTheme = Readonly<{
  gridLine: string;
  gridLabel: string;
  /** Resolve a color palette name (e.g. "strawberry") to its primary CSS color value. */
  resolveColor: (name: string) => string;
}>;

export type TimelineEnv = Readonly<{
  surface: "main" | "navigator";
  /** If true, the renderer should scale/compress vertical layout to fit `canvasHeight`. */
  fitToHeight: boolean;
  canvasHeight: Px.Px;
  theme: TimelineTheme;
}>;

export type TimelineRendererCore<Data, State, Action, RenderModel = unknown> = Readonly<{
  kind: string;
  buildModel: (args: {
    data: Data;
    projection: ProjectionContext;
    state: State;
    env: TimelineEnv;
  }) => RenderModel;
  drawCanvas?: (args: {
    ctx: CanvasRenderingContext2D;
    model: RenderModel;
    projection: ProjectionContext;
    state: State;
    env: TimelineEnv;
  }) => void;
  /**
   * Optional pure hit-testing. If provided, the UI host can implement pointer handling
   * without coupling event handlers to the overlay tree.
   */
  hitTest?: (args: {
    model: RenderModel;
    projection: ProjectionContext;
    state: State;
    env: TimelineEnv;
    x: Px.Px;
    y: Px.Px;
  }) => Action | null;
}>;
