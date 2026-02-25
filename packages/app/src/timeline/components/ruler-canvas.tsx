import type { Handle } from "@remix-run/component";
import { cn } from "@daw/utils";
import * as Px from "@daw/core/lib/px";

import type { TimeSignature } from "@daw/core/lib/time-signature";
import { RulerSceneRenderer, type RulerEnv } from "../renderers/ruler/scene";
import { ProjectionRoot } from "./projection-root";
import { TimelineRoot } from "./timeline-root";
import { renderToCanvas } from "../scene";
import { prepareCanvas } from "../utils/prepare-canvas";
import { readTimelineTheme } from "../lib/theme";

const DEFAULT_RULER_HEIGHT = 27;

export function RulerCanvas(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);
  const rootCtx = handle.context.get(TimelineRoot);
  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLElement | null = null;
  let isScrubbing = false;

  handle.on(projection, { change: () => handle.update() });

  function positionFromPointer(e: PointerEvent): Px.Px {
    if (!containerEl) return Px.zero;
    const rect = containerEl.getBoundingClientRect();
    return Px.Px(e.clientX - rect.left);
  }

  function seekToPointer(e: PointerEvent) {
    const localX = positionFromPointer(e);
    const qnPos = projection.screenToContentX(localX);
    rootCtx.transport.setPlayheadPosition(qnPos);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    seekToPointer(e);
    isScrubbing = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isScrubbing) return;
    seekToPointer(e);
  }

  function onPointerUp() {
    isScrubbing = false;
  }

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

      const style = getComputedStyle(canvasEl);
      const env: RulerEnv = {
        theme: readTimelineTheme(),
        rulerBackground: style.getPropertyValue("--color-layer-2").trim(),
      };

      const ctx = prepareCanvas({
        canvas: canvasEl,
        cssW: Math.max(1, projection.containerWidth),
        cssH: height,
        dpr: window.devicePixelRatio || 1,
      });
      if (!ctx) return;

      const scene = RulerSceneRenderer.buildScene({
        data: { ...rest, height, playheadPosition: rootCtx.transport.playheadPosition },
        projection,
        state: undefined,
        env,
      });
      renderToCanvas(ctx, scene.canvas);
    });

    return (
      <div
        connect={(node: HTMLElement) => {
          containerEl = node;
        }}
        on={{
          pointerdown: onPointerDown,
          pointermove: onPointerMove,
          pointerup: onPointerUp,
        }}
        class={cn(
          "sticky left-0 relative bg-layer-2 border-y border-t-layer-4/80 dark:border-t-foreground/12 border-b-layer-4/40 dark:border-b-foreground/6 cursor-pointer",
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
