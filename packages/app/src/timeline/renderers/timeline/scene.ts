import type { Clip } from "@daw/core/domain/clip";
import * as SI from "@daw/core/lib/spatial-index";
import * as N from "@daw/core/lib/numeric";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import { computeBarSize, computeBeatSize, computeRulerTicks, Tier } from "@daw/core/lib/ruler";
import * as Span from "@daw/core/lib/span";
import type { InteractiveNode, Scene, SceneNode } from "../../scene";
import { point, rect, stroke } from "../../scene";
import type { SceneRenderer, BuildSceneArgs } from "../types";
import type { TimelineEnv, TimelineTheme } from "../core";
import { resolveClipTitle } from "@daw/core/domain/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "./types";
import { buildTrackLayouts, type TrackLayout } from "../../lib/track-layout";

// =============================================================================
// Constants
// =============================================================================

const CLIP_VERTICAL_PADDING = 1;
const CLIP_BORDER_RADIUS = 3;

// =============================================================================
// Helper Functions
// =============================================================================

/** Compute uniform track height for navigator (fit-to-height). */
function computeFitTrackHeight(trackCount: number, canvasHeight: Px.Px): Px.Px {
  return Px.Px(Number(canvasHeight) / Math.max(1, trackCount));
}

type ClipLayout = {
  clip: Clip;
  title: string;
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  compact: boolean;
  titleBarHeight: Px.Px;
  contentHeight: Px.Px;
  isSelected: boolean;
  trackColor: TrackColor;
};

/** Build a ClipLayout using per-track layout. */
function clipToLayout(
  clip: Clip,
  data: TimelineData,
  state: UIState,
  projection: BuildSceneArgs<TimelineData, UIState, TimelineEnv>["projection"],
  trackLayout: TrackLayout,
  trackColor: TrackColor,
  verticalPadding: number,
): ClipLayout {
  const clipEnd = Span.end(clip.span);
  const left = projection.contentToScreenX(clip.span.start);
  const right = projection.contentToScreenX(clipEnd);
  const width = N.max(Px.Px(1), N.subtract(right, left));
  const top = N.add(trackLayout.y, Px.Px(verticalPadding));
  const height = trackLayout.compact
    ? trackLayout.titleBarHeight
    : N.max(Px.Px(1), N.subtract(trackLayout.height, Px.Px(verticalPadding * 2)));

  return {
    clip,
    title: resolveClipTitle(clip.payload, data.view),
    x: left,
    y: top,
    width,
    height,
    compact: trackLayout.compact,
    titleBarHeight: trackLayout.titleBarHeight,
    contentHeight: trackLayout.contentHeight,
    isSelected: state.selectedClipId === clip.id,
    trackColor,
  };
}

/** Build a ClipLayout using uniform track height (for navigator). */
function clipToUniformLayout(
  clip: Clip,
  data: TimelineData,
  state: UIState,
  projection: BuildSceneArgs<TimelineData, UIState, TimelineEnv>["projection"],
  trackHeight: Px.Px,
  trackRow: number,
  trackColor: TrackColor,
  verticalPadding: number,
): ClipLayout {
  const clipEnd = Span.end(clip.span);
  const left = projection.contentToScreenX(clip.span.start);
  const right = projection.contentToScreenX(clipEnd);
  const width = N.max(Px.Px(1), N.subtract(right, left));
  const top = N.add(N.multiply(trackHeight, trackRow), Px.Px(verticalPadding));
  const height = N.max(Px.Px(1), N.subtract(trackHeight, Px.Px(verticalPadding * 2)));

  return {
    clip,
    title: resolveClipTitle(clip.payload, data.view),
    x: left,
    y: top,
    width,
    height,
    compact: false,
    titleBarHeight: trackHeight,
    contentHeight: Px.Px(0),
    isSelected: state.selectedClipId === clip.id,
    trackColor,
  };
}

/** Viewport-filtered clip layouts using SpatialIndex and per-track layouts (main surface). */
function computeClipLayouts({
  data,
  state,
  projection,
  verticalPadding = CLIP_VERTICAL_PADDING,
}: Pick<BuildSceneArgs<TimelineData, UIState, TimelineEnv>, "data" | "state" | "projection"> & {
  verticalPadding?: number;
}): ClipLayout[] {
  const { view } = data;
  const trackLayouts = buildTrackLayouts(view.trackOrder, view.trackById);
  const visibleClips = SI.queryGroups(view.clipIndex, view.trackOrder, projection.view);

  const layouts: ClipLayout[] = [];
  for (const [trackId, clipIds] of visibleClips) {
    const track = view.trackById.get(trackId);
    const trackLayout = trackLayouts.get(trackId);
    if (!track || !trackLayout) continue;

    for (const clipId of clipIds) {
      const clip = view.clipById.get(clipId);
      if (!clip) continue;
      layouts.push(
        clipToLayout(clip, data, state, projection, trackLayout, track.color, verticalPadding),
      );
    }
  }
  return layouts;
}

/** All clip layouts for navigator surface (no spatial filtering, uniform height). */
function computeAllClipLayouts({
  data,
  state,
  projection,
  trackHeight,
  verticalPadding = CLIP_VERTICAL_PADDING,
}: Pick<BuildSceneArgs<TimelineData, UIState, TimelineEnv>, "data" | "state" | "projection"> & {
  trackHeight: Px.Px;
  verticalPadding?: number;
}): ClipLayout[] {
  const { view } = data;
  const layouts: ClipLayout[] = [];

  for (const clip of view.clipById.values()) {
    const track = view.trackById.get(clip.trackId);
    const trackRow = view.trackIndex.get(clip.trackId);
    if (!track || trackRow == null) continue;
    layouts.push(
      clipToUniformLayout(
        clip,
        data,
        state,
        projection,
        trackHeight,
        trackRow,
        track.color,
        verticalPadding,
      ),
    );
  }
  return layouts;
}

// =============================================================================
// Scene Builder
// =============================================================================

/** Map a tick tier to a grid line color. */
function gridLineColor(tier: number, finestTier: number, theme: TimelineTheme): string {
  if (tier >= Tier.BAR) return theme.gridLinePrimary;
  if (tier >= Tier.BEAT && finestTier < Tier.BEAT) return theme.gridLinePrimary;
  return theme.gridLineSecondary;
}

/**
 * Build canvas nodes for the main (projection) surface.
 * Grid lines for every ruler tick, colored by tier.
 * Clips are rendered as DOM for interactivity.
 */
function buildMainCanvasNodes({
  projection,
  data,
  env,
}: Pick<
  BuildSceneArgs<TimelineData, UIState, TimelineEnv>,
  "projection" | "data" | "env"
>): SceneNode<never>[] {
  const nodes: SceneNode<never>[] = [];

  const result = computeRulerTicks({
    viewStart: projection.view.start,
    viewSize: projection.view.size,
    scale: projection.scale,
    timeSignature: data.project.timeSignature,
  });

  // Alternating backgrounds — interval depends on zoom level
  const bar = Number(computeBarSize(data.project.timeSignature));
  const beat = Number(computeBeatSize(data.project.timeSignature));
  const viewStart = Number(projection.view.start);
  const viewSize = Number(projection.view.size);
  const viewEnd = viewStart + viewSize;
  const visibleBars = viewSize / bar;

  // Pick alternation interval based on how many bars are visible
  const step =
    visibleBars >= 48 ? bar * 16 : visibleBars >= 12 ? bar * 4 : visibleBars >= 3 ? bar : beat;

  const first = Math.floor(viewStart / step);
  const last = Math.ceil(viewEnd / step);

  for (let i = first; i < last; i++) {
    if (i % 2 === 0) continue; // even slots = transparent
    const left = Number(projection.contentToScreenX(QN.QN(i * step)));
    const right = Number(projection.contentToScreenX(QN.QN((i + 1) * step)));
    nodes.push({
      kind: "rect",
      rect: rect(left, Px.Px(0), Px.Px(right - left), env.canvasHeight),
      fill: env.theme.barBackground,
    });
  }

  // Vertical grid lines — batched by color
  const linesByColor = new Map<string, [{ x: number; y: number }, { x: number; y: number }][]>();
  for (const tick of result.ticks) {
    const screenX = Number(projection.contentToScreenX(tick.position));
    if (screenX <= 1 || screenX >= projection.containerWidth - 1) continue;

    const x = screenX + 0.5;
    const color = gridLineColor(tick.tier, result.finestTier, env.theme);
    let segments = linesByColor.get(color);
    if (!segments) {
      segments = [];
      linesByColor.set(color, segments);
    }
    segments.push([point(x, 0), point(x, Number(env.canvasHeight))]);
  }
  for (const [color, segments] of linesByColor) {
    nodes.push({ kind: "lines", segments, stroke: stroke(color, 1) });
  }

  // Horizontal track separator lines
  const trackLayouts = buildTrackLayouts(data.view.trackOrder, data.view.trackById);
  const trackSeparatorStroke = stroke(env.theme.gridLinePrimary, 2);
  const lastTrackIndex = data.view.trackOrder.length - 1;
  for (let i = 0; i < data.view.trackOrder.length; i++) {
    if (i === lastTrackIndex) continue; // skip trailing separator after last track
    const trackId = data.view.trackOrder[i];
    if (!trackId) continue;
    const layout = trackLayouts.get(trackId);
    if (!layout) continue;
    const y = Px.Px(Number(N.add(layout.y, layout.height)));
    nodes.push({
      kind: "line",
      points: [point(Px.Px(0), y), point(projection.containerWidth, y)],
      stroke: trackSeparatorStroke,
    });
  }

  return nodes;
}

/**
 * Build canvas nodes for the navigator surface.
 * Low fidelity: just track separators and simple clip rectangles.
 * No grid lines, no text, no interactivity.
 */
function buildNavigatorCanvasNodes({
  data,
  clipLayouts,
  projection,
  trackHeight,
  env,
}: Pick<BuildSceneArgs<TimelineData, UIState, TimelineEnv>, "data" | "projection" | "env"> & {
  clipLayouts: ClipLayout[];
  trackHeight: Px.Px;
}): SceneNode<never>[] {
  const nodes: SceneNode<never>[] = [];

  // Only render track separator lines if 4 or fewer tracks
  const trackCount = data.view.trackOrder.length;
  const showSeparators = trackCount <= 4;
  if (showSeparators) {
    const borderStroke = stroke(env.theme.gridLinePrimary, 1);
    for (let i = 1; i < trackCount; i++) {
      const y = N.add(N.multiply(trackHeight, i), Px.Px(0.5));
      nodes.push({
        kind: "line",
        points: [point(Px.Px(0), y), point(projection.containerWidth, y)],
        stroke: borderStroke,
      });
    }
  }

  // Simple clip rectangles using track colors
  // Height is 1px less if showing separators to avoid overlap
  for (const layout of clipLayouts) {
    const clipHeight = showSeparators ? N.subtract(layout.height, Px.Px(1)) : layout.height;
    nodes.push({
      kind: "rect",
      rect: rect(layout.x, layout.y, layout.width, clipHeight),
      fill: env.theme.resolveColor(layout.trackColor, "primary"),
    });
  }

  return nodes;
}

function buildDomNodes({
  clipLayouts,
  projection,
  env,
}: Pick<BuildSceneArgs<TimelineData, UIState, TimelineEnv>, "projection" | "env"> & {
  clipLayouts: ClipLayout[];
}): InteractiveNode<UIAction>[] {
  const nodes: InteractiveNode<UIAction>[] = [];

  // Background hit area to clear selection
  nodes.push({
    kind: "rect",
    rect: rect(Px.Px(0), Px.Px(0), projection.containerWidth, env.canvasHeight),
    action: { type: "select-clip", clipId: null },
  });

  // Clip elements
  for (const layout of clipLayouts) {
    const color = layout.trackColor;
    const fill = `var(--color-${color}-primary)`;
    const border = layout.isSelected
      ? `var(--color-clip-border-selected)`
      : `var(--color-${color}-primary-active)`;

    // Use clip rect for group bounds so groups don't overlap
    const clipRect = rect(layout.x, layout.y, layout.width, layout.height);

    nodes.push({
      kind: "group",
      clip: clipRect,
      borderRadius: CLIP_BORDER_RADIUS,
      children: [
        // Clip background (positioned at 0,0 within the group)
        {
          kind: "rect",
          rect: rect(Px.Px(0), Px.Px(0), layout.width, layout.height),
          fill,
          stroke: stroke(border, 1),
        },
        // Clip title in title bar area
        {
          kind: "text",
          position: point(
            Px.Px(8),
            N.divide(layout.titleBarHeight, 2),
          ),
          text: layout.title,
          style: {
            font: "12px system-ui, sans-serif",
            color: `var(--color-${color}-primary-foreground)`,
            baseline: "middle",
          },
        },
      ],
      action: { type: "select-clip", clipId: layout.clip.id },
    });
  }

  return nodes;
}

// =============================================================================
// Scene Renderer
// =============================================================================

/**
 * Scene graph based DAW skeleton renderer.
 *
 * Renders differently based on surface:
 * - **main**: Full fidelity with canvas grid + DOM interactive clips, per-track heights
 * - **navigator**: Low fidelity canvas-only (track lanes + simple clip shapes, not interactive)
 */
export const TimelineSceneRenderer: SceneRenderer<TimelineData, UIState, UIAction, TimelineEnv> = {
  kind: "daw-skeleton",

  buildScene: ({ data, projection, state, env }): Scene<UIAction> => {
    // Navigator: all clips (no spatial filtering), canvas-only, uniform fit-to-height
    if (env.surface === "navigator") {
      const trackHeight = computeFitTrackHeight(data.view.trackOrder.length, env.canvasHeight);
      const clipLayouts = computeAllClipLayouts({
        data,
        state,
        projection,
        trackHeight,
        verticalPadding: 0,
      });
      return {
        canvas: buildNavigatorCanvasNodes({
          data,
          clipLayouts,
          trackHeight,
          env,
          projection,
        }),
        dom: [],
      };
    }

    // Main (projection): viewport-filtered clips with interactive DOM, per-track heights
    const clipLayouts = computeClipLayouts({
      data,
      state,
      projection,
    });
    return {
      canvas: buildMainCanvasNodes({ data, projection, env }),
      dom: buildDomNodes({ clipLayouts, projection, env }),
    };
  },
};
