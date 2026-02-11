import type { Handle } from "@remix-run/component";
import { cn } from "@daw/utils";

import type { SceneRenderer } from "../renderers/types";
import { ProjectionRoot } from "./projection-root";
import type { ProjectionRootContext } from "./projection-root";
import { TimelineDom } from "./timeline-dom";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";
import type { DawAction, DawData, DawUiState } from "../renderers/daw-skeleton/types";

export function ProjectionDom(handle: Handle) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  const projCtx: ProjectionRootContext = handle.context.get(ProjectionRoot);

  return (props: {
    renderer: SceneRenderer<DawData, DawUiState, DawAction>;
    data: DawData;
    ui: DawUiState;
    dispatch: (action: DawAction) => void;
    class?: string;
  }) => {
    return (
      <TimelineDom
        dpr={rootCtx.dpr}
        projection={projCtx.projection}
        size={projCtx.size}
        height={projCtx.height}
        surface="main"
        fitToHeight={true}
        renderer={props.renderer}
        data={props.data}
        ui={props.ui}
        dispatch={props.dispatch}
        class={cn(props.class, "pointer-events-auto")}
      />
    );
  };
}
