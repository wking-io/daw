import type { QN } from "@daw/core/lib/qn";
import * as Px from "@daw/core/lib/px";
import { computeRulerTicks } from "@daw/core/lib/ruler";
import type { InteractiveNode, Scene, SceneNode } from "../../scene";
import { point, rect, stroke } from "../../scene";
import type { SceneRenderer, BuildSceneArgs } from "../types";
import type { DawAction, DawClip, DawData, DawUiState, TrackColor } from "./types";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TRACK_HEIGHT_PX = 28;
const CLIP_VERTICAL_PADDING = 3;
const CLIP_BORDER_RADIUS = 3;

// =============================================================================
// Helper Functions
// =============================================================================

function computeTrackHeightPx(args: {
  trackCount: number;
  fitToHeight: boolean;
  canvasHeightPx: Px.Px;
}): Px.Px {
  const { trackCount, fitToHeight, canvasHeightPx } = args;
  if (!fitToHeight) return Px.Px(DEFAULT_TRACK_HEIGHT_PX);
  return Px.Px(Number(canvasHeightPx) / Math.max(1, trackCount));
}

type ClipLayout = {
  clip: DawClip;
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  isSelected: boolean;
  trackColor: TrackColor;
};

function computeClipLayouts(args: {
  data: DawData;
  ui: DawUiState;
  projection: { contentToScreenX: (x: QN) => Px.Px };
  trackHeightPx: Px.Px;
  verticalPadding?: number;
}): ClipLayout[] {
  const { data, ui, projection, trackHeightPx } = args;
  const padding = args.verticalPadding ?? CLIP_VERTICAL_PADDING;

  const trackById = new Map<string, { index: number; color: TrackColor }>();
  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i]!;
    trackById.set(track.id, { index: i, color: track.color });
  }

  const layouts: ClipLayout[] = [];

  for (const clip of data.clips) {
    const trackInfo = trackById.get(clip.trackId);
    if (trackInfo == null) continue;

    const leftPx = projection.contentToScreenX(clip.start);
    const rightPx = projection.contentToScreenX(clip.end);
    const widthPx = Px.max(Px.Px(1), Px.subtract(rightPx, leftPx));

    const topPx = Px.add(Px.multiply(trackHeightPx, trackInfo.index), Px.Px(padding));
    const heightPx = Px.max(Px.Px(1), Px.subtract(trackHeightPx, Px.Px(padding * 2)));

    layouts.push({
      clip,
      x: leftPx,
      y: topPx,
      width: widthPx,
      height: heightPx,
      isSelected: ui.selectedClipId === clip.id,
      trackColor: trackInfo.color,
    });
  }

  return layouts;
}

// =============================================================================
// Scene Builder
// =============================================================================

/** Map a tick tier to a grid line opacity (0–1). */
function gridOpacity(tier: number, finestTier: number): number {
  if (tier >= 5) return 0.6; // bars
  if (tier === 4) return 0.35; // beats
  if (tier === 3) return 0.2; // eighths
  if (tier === 2) return 0.15; // sixteenths
  if (tier === finestTier) return 0.08; // finest (32nds or 64ths)
  return 0.1; // intermediate
}

/**
 * Build canvas nodes for the main (projection) surface.
 * Grid lines for every ruler tick, with opacity varying by tier.
 * Clips are rendered as DOM for interactivity.
 */
function buildMainCanvasNodes(args: {
  data: DawData;
  projection: BuildSceneArgs<DawData, DawUiState>["projection"];
  env: BuildSceneArgs<DawData, DawUiState>["env"];
}): SceneNode<never>[] {
  const { data, projection, env } = args;
  const nodes: SceneNode<never>[] = [];
  const canvasHeight = env.canvas.heightPx;

  const result = computeRulerTicks({
    viewStart: projection.view.start,
    viewSize: projection.view.size,
    scale: projection.scale,
    timeSignature: data.timeSignature,
    ...data.rulerSettings,
  });

  const canvasWidth = Number(env.canvas.widthPx);

  for (const tick of result.ticks) {
    const screenX = Number(projection.contentToScreenX(tick.position));
    if (screenX <= 1 || screenX >= canvasWidth - 1) continue;

    const x = Px.Px(screenX + 0.5);
    const alpha = gridOpacity(tick.tier, result.finestTier);
    nodes.push({
      kind: "line",
      points: [point(x, Px.Px(0)), point(x, canvasHeight)],
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
function buildNavigatorCanvasNodes(args: {
  data: DawData;
  clipLayouts: ClipLayout[];
  env: BuildSceneArgs<DawData, DawUiState>["env"];
  trackHeightPx: Px.Px;
}): SceneNode<never>[] {
  const { data, clipLayouts, env, trackHeightPx } = args;
  const nodes: SceneNode<never>[] = [];

  const canvasWidth = env.canvas.widthPx;

  // Only render track separator lines if 4 or fewer tracks
  const showSeparators = data.tracks.length <= 4;
  if (showSeparators) {
    const borderStroke = stroke(env.theme.gridLine, 1);
    for (let i = 1; i < data.tracks.length; i++) {
      const y = Px.Px(Number(Px.multiply(trackHeightPx, i)) + 0.5); // +0.5 for crisp 1px line
      nodes.push({
        kind: "line",
        points: [point(Px.Px(0), y), point(canvasWidth, y)],
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

function buildDomNodes(args: {
  clipLayouts: ClipLayout[];
  env: BuildSceneArgs<DawData, DawUiState>["env"];
}): InteractiveNode<DawAction>[] {
  const { clipLayouts, env } = args;
  const nodes: InteractiveNode<DawAction>[] = [];

  // Background hit area to clear selection
  nodes.push({
    kind: "rect",
    rect: rect(Px.Px(0), Px.Px(0), env.canvas.widthPx, env.canvas.heightPx),
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
          text: layout.clip.title,
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
export const DawSkeletonSceneRenderer: SceneRenderer<DawData, DawUiState, DawAction> = {
  kind: "daw-skeleton",

  buildScene: ({ data, projection, ui, env }): Scene<DawAction> => {
    const trackHeightPx = computeTrackHeightPx({
      trackCount: data.tracks.length,
      fitToHeight: env.fitToHeight,
      canvasHeightPx: env.canvas.heightPx,
    });

    const clipLayouts = computeClipLayouts({
      data,
      ui,
      projection,
      trackHeightPx,
      verticalPadding: env.surface === "navigator" ? 0 : undefined,
    });

    // Navigator: low fidelity, canvas-only, not interactive
    if (env.surface === "navigator") {
      return {
        canvas: buildNavigatorCanvasNodes({
          data,
          clipLayouts,
          env,
          trackHeightPx,
        }),
        dom: [], // No interactive elements in navigator
      };
    }

    // Main (projection): full fidelity with interactive DOM clips
    return {
      canvas: buildMainCanvasNodes({ data, projection, env }),
      dom: buildDomNodes({ clipLayouts, env }),
    };
  },
};
