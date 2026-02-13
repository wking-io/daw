import { computeRulerTicks } from "@daw/core/lib/ruler";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import type { Scene, SceneNode } from "../../scene";
import { point, stroke, textStyle } from "../../scene";
import type { BuildSceneArgs, SceneRenderer } from "../types";

export type RulerData = Readonly<{
  timeSignature: TimeSignature;
  minSpacingPx?: number;
  minLabelSpacingPx?: number;
  maxSubdivisions?: number;
}>;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const LABEL_FONT = "10px Inter, ui-sans-serif, system-ui, sans-serif";
const LABEL_OFFSET_X = 3;
const LABEL_Y = 8;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export const RulerSceneRenderer: SceneRenderer<RulerData, void, never> = {
  kind: "ruler",

  buildScene({ data, projection, env }: BuildSceneArgs<RulerData, void>): Scene<never> {
    const height = Number(env.canvas.heightPx);
    const nodes: SceneNode<never>[] = [];

    const result = computeRulerTicks({
      viewStart: projection.view.start,
      viewSize: projection.view.size,
      scale: projection.scale,
      timeSignature: data.timeSignature,
      minSpacingPx: data.minSpacingPx,
      minLabelSpacingPx: data.minLabelSpacingPx,
      maxSubdivisions: data.maxSubdivisions,
    });

    console.log(env.theme.gridLabel);

    const tickStroke = stroke(env.theme.gridLine, 1);
    const labelStyle = textStyle(LABEL_FONT, env.theme.gridLabel, "left", "top");

    const width = Number(env.canvas.widthPx);

    for (const tick of result.ticks) {
      const screenX = Number(projection.contentToScreenX(tick.position));
      if (screenX <= 1 || screenX >= width - 1) continue;

      const x = screenX + 0.5; // +0.5 for crisp 1px line
      const topY = tick.label ? LABEL_Y : height - 4;

      nodes.push({
        kind: "line",
        points: [point(x, topY), point(x, height)],
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
