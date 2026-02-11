import type { Handle } from "@remix-run/component";

import type { SceneRenderer } from "../renderers/types";
import { NavigatorRoot } from "./navigator-root";
import type { NavigatorRootContext } from "./navigator-root";
import { TimelineDom } from "./timeline-dom";
import type { DawAction, DawData, DawUiState } from "../renderers/daw-skeleton/types";

export function NavigatorDom(handle: Handle) {
  const navCtx: NavigatorRootContext = handle.context.get(NavigatorRoot);

  return (props: {
    renderer: SceneRenderer<DawData, DawUiState, DawAction>;
    data: DawData;
    ui: DawUiState;
    dispatch: (action: DawAction) => void;
    class?: string;
  }) => {
    return (
      <TimelineDom
        projection={navCtx.projection}
        size={navCtx.size}
        height={navCtx.height}
        surface="navigator"
        fitToHeight={true}
        renderer={props.renderer}
        data={props.data}
        ui={props.ui}
        dispatch={props.dispatch}
        class={props.class}
      />
    );
  };
}
