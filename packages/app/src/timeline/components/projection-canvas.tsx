import type { Handle } from "@remix-run/component";

import * as Px from "@daw/core/lib/px";
import { ProjectionRoot } from "./projection-root";
import { cn } from "@daw/utils";
import type { TimelineData, UIState } from "../renderers/timeline/types";
import { TimelineSceneRenderer } from "../renderers/timeline/scene";
import { renderToCanvas } from "../scene";
import { prepareCanvas } from "../utils/prepare-canvas";
import type { TimelineEnv } from "../renderers/core";
import { readTimelineTheme } from "../lib/theme";

export function ProjectionCanvas(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);
  let canvasEl: HTMLCanvasElement;

  handle.on(projection, { change: () => handle.update() });

  return ({
    data,
    state,
    fitToHeight,
  }: {
    data: TimelineData;
    state: UIState;
    fitToHeight: boolean;
  }) => {
    const dpr = window.devicePixelRatio || 1;

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssH = canvasEl.parentElement?.clientHeight ?? 0;

      const ctx = prepareCanvas({
        canvas: canvasEl,
        cssW: Math.max(1, projection.containerWidth),
        cssH,
        dpr,
      });

      if (!ctx) return;

      const env: TimelineEnv = {
        surface: "main",
        fitToHeight,
        canvasHeight: Px.Px(cssH),
        theme: readTimelineTheme(),
      };

      const scene = TimelineSceneRenderer.buildScene({
        data,
        projection,
        state,
        env,
      });

      renderToCanvas(ctx, scene.canvas);
    });
    return (
      <canvas
        connect={(node: HTMLCanvasElement) => {
          canvasEl = node;
        }}
        draggable={false}
        class={cn("absolute pointer-events-none inset-0")}
      />
    );
  };
}
