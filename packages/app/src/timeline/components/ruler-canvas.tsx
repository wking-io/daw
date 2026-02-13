import type { Handle } from "@remix-run/component";
import { cn } from "@daw/utils";

import type { TimeSignature } from "@daw/core/lib/time-signature";
import type { SceneRenderer } from "../renderers/types";
import { RulerSceneRenderer } from "../renderers/ruler/scene";
import { ProjectionRoot } from "./projection-root";
import type { ProjectionRootContext } from "./projection-root";
import { TimelineCanvas } from "./timeline-canvas";

const DEFAULT_RULER_HEIGHT = 22;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderer = RulerSceneRenderer as SceneRenderer<any, any, any>;

export function RulerCanvas(handle: Handle) {
  const projCtx: ProjectionRootContext = handle.context.get(ProjectionRoot);

  return (props: {
    timeSignature: TimeSignature;
    height?: number;
    class?: string;
    minSpacingPx?: number;
    minLabelSpacingPx?: number;
    maxSubdivisions?: number;
  }) => {
    const h = props.height ?? DEFAULT_RULER_HEIGHT;

    return (
      <div
        class={cn(
          "relative bg-layer-2 border-y border-t-layer-4/80 dark:border-t-foreground/12 border-b-layer-4/40 dark:border-b-foreground/6",
          props.class,
        )}
        style={{ height: `${h}px` }}
      >
        <TimelineCanvas
          projection={projCtx.projection}
          size={{ width: projCtx.size.width, height: h }}
          height={h}
          surface="main"
          fitToHeight={false}
          renderer={renderer}
          data={{
            timeSignature: props.timeSignature,
            minSpacingPx: props.minSpacingPx,
            minLabelSpacingPx: props.minLabelSpacingPx,
            maxSubdivisions: props.maxSubdivisions,
          }}
          ui={undefined}
        />
      </div>
    );
  };
}
