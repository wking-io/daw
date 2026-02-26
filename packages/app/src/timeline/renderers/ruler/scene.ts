import { computeRulerTicks } from "@daw/core/lib/ruler";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import type * as QN from "@daw/core/lib/qn";
import type { Scene, SceneNode } from "../../scene";
import { point, stroke, textStyle } from "../../scene";
import type { BuildSceneArgs, SceneRenderer } from "../types";
import type { TimelineTheme } from "../core";

export type RulerData = Readonly<{
  timeSignature: TimeSignature;
  height: number;
  playheadPosition?: QN.QN;
}>;

export type RulerEnv = Readonly<{ theme: TimelineTheme; rulerBackground: string }>;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const LABEL_FONT = "10px Inter, ui-sans-serif, system-ui, sans-serif";
const LABEL_OFFSET_X = 3;
const LABEL_Y = 5;
const PLAYHEAD_RECT_HEIGHT = 5;
const PLAYHEAD_TRI_HEIGHT = 5;
const PLAYHEAD_ZONE_HEIGHT = PLAYHEAD_RECT_HEIGHT + PLAYHEAD_TRI_HEIGHT;
const PLAYHEAD_HALF_W = 4;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export const RulerSceneRenderer: SceneRenderer<RulerData, void, never, RulerEnv> = {
  kind: "ruler",

  buildScene({ data, projection, env }: BuildSceneArgs<RulerData, void, RulerEnv>): Scene<never> {
    const nodes: SceneNode<never>[] = [];
    const rulerTop = data.height - PLAYHEAD_ZONE_HEIGHT; // boundary between label zone and playhead zone

    const result = computeRulerTicks({
      viewStart: projection.view.start,
      viewSize: projection.view.size,
      scale: projection.scale,
      timeSignature: data.timeSignature,
    });

    const tickStroke = stroke(env.theme.tick, 1);
    const labelStyle = textStyle(LABEL_FONT, env.theme.gridLabel, "left", "top");

    const tickSegments: [{ x: number; y: number }, { x: number; y: number }][] = [];
    for (const tick of result.ticks) {
      const screenX = Number(projection.contentToScreenX(tick.position));
      if (screenX <= 1 || screenX >= projection.containerWidth - 1) continue;

      const x = screenX + 0.5; // +0.5 for crisp 1px line
      const topY = tick.label ? LABEL_Y : data.height - PLAYHEAD_TRI_HEIGHT;

      tickSegments.push([point(x, topY), point(x, data.height)]);

      if (tick.label != null) {
        nodes.push({
          kind: "text",
          position: point(x + LABEL_OFFSET_X, LABEL_Y),
          text: tick.label,
          style: labelStyle,
        });
      }
    }
    if (tickSegments.length > 0) {
      nodes.push({ kind: "lines", segments: tickSegments, stroke: tickStroke });
    }

    // Playhead triangle (line renders only in the projection area below)
    if (data.playheadPosition != null) {
      const screenX = Number(projection.contentToScreenX(data.playheadPosition));
      if (screenX >= -PLAYHEAD_HALF_W && screenX <= projection.containerWidth + PLAYHEAD_HALF_W) {
        const x = screenX + 0.5;
        const top = rulerTop;
        const mid = rulerTop + PLAYHEAD_RECT_HEIGHT;

        // Rectangle top + triangle bottom (pentagon)
        nodes.push({
          kind: "path",
          points: [
            point(x - PLAYHEAD_HALF_W, top),
            point(x + PLAYHEAD_HALF_W, top),
            point(x + PLAYHEAD_HALF_W, mid),
            point(x, top + PLAYHEAD_ZONE_HEIGHT),
            point(x - PLAYHEAD_HALF_W, mid),
          ],
          fill: env.theme.playhead,
        });

        // 1px separator lines at the top of the playhead in the ruler background color
        nodes.push({
          kind: "line",
          points: [point(x - PLAYHEAD_HALF_W, top), point(x + PLAYHEAD_HALF_W, top)],
          stroke: stroke(env.rulerBackground, 1),
        });
        nodes.push({
          kind: "line",
          points: [point(x, top), point(x, top + 3)],
          stroke: stroke(env.rulerBackground, 1),
        });
      }
    }

    return { canvas: nodes, dom: [] };
  },
};
