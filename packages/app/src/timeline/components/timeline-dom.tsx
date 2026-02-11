import type { RemixNode } from "@remix-run/component";

import type { Projection1D } from "../foundation/projection1d";
import type * as Px from "../lib/px";
import type { TimelineHostEnv } from "../renderers/core";
import type { SceneRenderer } from "../renderers/types";
import { renderToDom } from "../scene";
import type { DawAction, DawData, DawUiState } from "../renderers/daw-skeleton/types";

export function TimelineDom() {
  return (props: {
    dpr: number;
    projection: Projection1D<Px.Px>;
    size: { width: number; height: number };
    height: number;
    surface: "main" | "navigator";
    fitToHeight: boolean;
    renderer: SceneRenderer<DawData, DawUiState, DawAction>;
    data: DawData;
    ui: DawUiState;
    dispatch: (action: DawAction) => void;
    class?: string;
  }): RemixNode => {
    const env: TimelineHostEnv = {
      canvas: {
        dpr: props.dpr,
        widthPx: props.size.width as Px.Px,
        heightPx: props.height as Px.Px,
      },
      surface: props.surface,
      fitToHeight: props.fitToHeight,
    };

    const scene = props.renderer.buildScene({
      data: props.data,
      projection: props.projection,
      ui: props.ui,
      env,
    });

    const domContent = renderToDom(scene.dom, props.dispatch);

    return (
      <div
        class={props.class}
        style={{
          position: "absolute",
          inset: "0",
          overflow: "hidden",
        }}
      >
        {domContent}
      </div>
    );
  };
}
