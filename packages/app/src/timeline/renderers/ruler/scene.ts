import { computeRulerTicks } from "@daw/core/lib/ruler";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import type { Scene, SceneNode } from "../../scene";
import { point, stroke, textStyle } from "../../scene";
import type { BuildSceneArgs, SceneRenderer } from "../types";
import type { TimelineTheme } from "../core";

export type RulerData = Readonly<{
  timeSignature: TimeSignature;
  height: number;
}>;

export type RulerEnv = Readonly<{ theme: TimelineTheme }>;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const LABEL_FONT = "10px Inter, ui-sans-serif, system-ui, sans-serif";
const LABEL_OFFSET_X = 3;
const LABEL_Y = 8;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export const RulerSceneRenderer: SceneRenderer<RulerData, void, never, RulerEnv> = {
  kind: "ruler",

  buildScene({ data, projection, env }: BuildSceneArgs<RulerData, void, RulerEnv>): Scene<never> {
    const nodes: SceneNode<never>[] = [];

    const result = computeRulerTicks({
      viewStart: projection.view.start,
      viewSize: projection.view.size,
      scale: projection.scale,
      timeSignature: data.timeSignature,
    });

    const tickStroke = stroke(env.theme.tick, 1);
    const labelStyle = textStyle(LABEL_FONT, env.theme.gridLabel, "left", "top");

    for (const tick of result.ticks) {
      const screenX = Number(projection.contentToScreenX(tick.position));
      if (screenX <= 1 || screenX >= projection.containerWidth - 1) continue;

      const x = screenX + 0.5; // +0.5 for crisp 1px line
      const topY = tick.label ? LABEL_Y : data.height - 4;

      nodes.push({
        kind: "line",
        points: [point(x, topY), point(x, data.height)],
        stroke: tickStroke,
      });

      if (tick.label != null) {
        nodes.push({
          kind: "text",
          position: point(x + LABEL_OFFSET_X, LABEL_Y),
          text: tick.label,
          style: labelStyle,
        });
      }
    }

    return { canvas: nodes, dom: [] };
  },
};
