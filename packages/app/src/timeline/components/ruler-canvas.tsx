import type { Handle } from "@remix-run/component";
import { cn } from "@daw/utils";

import type { TimeSignature } from "@daw/core/lib/time-signature";
import { RulerSceneRenderer, type RulerEnv } from "../renderers/ruler/scene";
import { ProjectionRoot } from "./projection-root";
import { renderToCanvas } from "../scene";
import { prepareCanvas } from "../utils/prepare-canvas";
import { readTimelineTheme } from "../lib/theme";

const DEFAULT_RULER_HEIGHT = 22;

export function RulerCanvas(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);
  let canvasEl: HTMLCanvasElement;

  handle.on(projection, { change: () => handle.update() });

  return ({
    class: classes,
    height = DEFAULT_RULER_HEIGHT,
    ...rest
  }: {
    timeSignature: TimeSignature;
    height?: number;
    class?: string;
  }) => {
    handle.queueTask(() => {
      if (!canvasEl) return;

      const env: RulerEnv = {
        theme: readTimelineTheme(),
      };

      const ctx = prepareCanvas({
        canvas: canvasEl,
        cssW: Math.max(1, projection.containerWidth),
        cssH: height,
        dpr: window.devicePixelRatio || 1,
      });
      if (!ctx) return;

      const scene = RulerSceneRenderer.buildScene({
        data: { ...rest, height },
        projection,
        state: undefined,
        env,
      });
      renderToCanvas(ctx, scene.canvas);
    });

    return (
      <div
        class={cn(
          "sticky left-0 relative bg-layer-2 border-y border-t-layer-4/80 dark:border-t-foreground/12 border-b-layer-4/40 dark:border-b-foreground/6",
          classes,
        )}
        style={{ height: `${height}px` }}
      >
        <canvas
          connect={(node: HTMLCanvasElement) => {
            canvasEl = node;
          }}
          draggable={false}
          class={cn("absolute pointer-events-none inset-0")}
        />
      </div>
    );
  };
}
