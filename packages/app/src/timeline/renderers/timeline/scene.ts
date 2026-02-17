import type { Clip } from "@daw/core/domain/clip";
import * as BI from "@daw/core/lib/bucket-index";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import { computeRulerTicks, Tier } from "@daw/core/lib/ruler";
import * as Span from "@daw/core/lib/span";
import type { InteractiveNode, Scene, SceneNode } from "../../scene";
import { point, rect, stroke } from "../../scene";
import type { SceneRenderer, BuildSceneArgs } from "../types";
import type { TimelineEnv } from "../core";
import { resolveClipTitle } from "@daw/core/lib/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "./types";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TRACK_HEIGHT_PX = 28;
const CLIP_VERTICAL_PADDING = 3;
const CLIP_BORDER_RADIUS = 3;

// =============================================================================
// Helper Functions
// =============================================================================

function computeTrackHeight({
  trackCount,
  fitToHeight,
  canvasHeight,
}: {
  trackCount: number;
  fitToHeight: boolean;
  canvasHeight: Px.Px;
}): Px.Px {
  if (!fitToHeight) return Px.Px(DEFAULT_TRACK_HEIGHT_PX);
  return Px.Px(Number(canvasHeight) / Math.max(1, trackCount));
}

type ClipLayout = {
  clip: Clip;
  title: string;
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  isSelected: boolean;
  trackColor: TrackColor;
};

/** Shared logic to build a ClipLayout from a clip and its track info. */
function clipToLayout(
  clip: Clip,
  data: TimelineData,
  state: UIState,
  projection: BuildSceneArgs<TimelineData, UIState, TimelineEnv>["projection"],
  trackHeight: Px.Px,
  trackRow: number,
  trackColor: TrackColor,
  verticalPadding: number,
): ClipLayout {
  const clipEnd = Span.end(QN.Numeric, clip.span);
  const left = projection.contentToScreenX(clip.span.start);
  const right = projection.contentToScreenX(clipEnd);
  const width = Px.max(Px.Px(1), Px.subtract(right, left));
  const top = Px.add(Px.multiply(trackHeight, trackRow), Px.Px(verticalPadding));
  const height = Px.max(Px.Px(1), Px.subtract(trackHeight, Px.Px(verticalPadding * 2)));

  return {
    clip,
    title: resolveClipTitle(clip, data.view),
    x: left,
    y: top,
    width,
    height,
    isSelected: state.selectedClipId === clip.id,
    trackColor,
  };
}

/** Viewport-filtered clip layouts using BucketIndex (main surface). */
function computeClipLayouts({
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
  const t0 = projection.view.start;
  const t1 = QN.add(projection.view.start, projection.view.size);
  const visibleClips = BI.queryTracks(view.clipIndex, view.trackOrder, t0, t1);

  const layouts: ClipLayout[] = [];
  for (const [trackId, clipIds] of visibleClips) {
    const track = view.trackById.get(trackId);
    const trackRow = view.trackIndex.get(trackId);
    if (!track || trackRow == null) continue;

    for (const clipId of clipIds) {
      const clip = view.clipById.get(clipId);
      if (!clip) continue;
      layouts.push(
        clipToLayout(
          clip,
          data,
          state,
          projection,
          trackHeight,
          trackRow,
          track.color as TrackColor,
          verticalPadding,
        ),
      );
    }
  }
  return layouts;
}

/** All clip layouts for navigator surface (no spatial filtering). */
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
      clipToLayout(
        clip,
        data,
        state,
        projection,
        trackHeight,
        trackRow,
        track.color as TrackColor,
        verticalPadding,
      ),
    );
  }
  return layouts;
}

// =============================================================================
// Scene Builder
// =============================================================================

/** Map a tick tier to a grid line opacity (0–1). */
function gridOpacity(tier: number, finestTier: number): number {
  if (tier >= Tier.BAR) return 0.6; // bars
  if (tier === Tier.BEAT) return 0.35; // beats
  if (tier === Tier.NOTE_8) return 0.2; // eighths
  if (tier === Tier.NOTE_16) return 0.15; // sixteenths
  if (tier === finestTier) return 0.08; // finest (32nds or 64ths)
  return 0.1; // intermediate
}

/**
 * Build canvas nodes for the main (projection) surface.
 * Grid lines for every ruler tick, with opacity varying by tier.
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

  for (const tick of result.ticks) {
    const screenX = Number(projection.contentToScreenX(tick.position));
    if (screenX <= 1 || screenX >= projection.containerWidth - 1) continue;

    const x = Px.Px(screenX + 0.5);
    const alpha = gridOpacity(tick.tier, result.finestTier);
    nodes.push({
      kind: "line",
      points: [point(x, Px.Px(0)), point(x, env.canvasHeight)],
      stroke: stroke(`rgba(128,128,128,${alpha})`, 1),
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
    const borderStroke = stroke(env.theme.gridLine, 1);
    for (let i = 1; i < trackCount; i++) {
      const y = Px.Px(Number(Px.multiply(trackHeight, i)) + 0.5); // +0.5 for crisp 1px line
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
    const clipHeight = showSeparators ? Px.subtract(layout.height, Px.Px(1)) : layout.height;
    nodes.push({
      kind: "rect",
      rect: rect(layout.x, layout.y, layout.width, clipHeight),
      fill: env.theme.resolveColor(layout.trackColor),
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
        // Clip title (positioned inside the clip, relative to group)
        {
          kind: "text",
          position: point(
            Px.Px(8), // padding-left
            Px.Px(Number(layout.height) / 2), // vertically centered (baseline: middle handles offset)
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
 * - **main**: Full fidelity with canvas grid + DOM interactive clips
 * - **navigator**: Low fidelity canvas-only (track lanes + simple clip shapes, not interactive)
 */
export const TimelineSceneRenderer: SceneRenderer<TimelineData, UIState, UIAction, TimelineEnv> = {
  kind: "daw-skeleton",

  buildScene: ({ data, projection, state, env }): Scene<UIAction> => {
    const trackHeight = computeTrackHeight({
      trackCount: data.view.trackOrder.length,
      fitToHeight: env.fitToHeight,
      canvasHeight: env.canvasHeight,
    });

    // Navigator: all clips (no spatial filtering), canvas-only
    if (env.surface === "navigator") {
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

    // Main (projection): viewport-filtered clips with interactive DOM
    const clipLayouts = computeClipLayouts({
      data,
      state,
      projection,
      trackHeight,
    });
    return {
      canvas: buildMainCanvasNodes({ data, projection, env }),
      dom: buildDomNodes({ clipLayouts, projection, env }),
    };
  },
};
