import type { Handle, RemixNode } from "@remix-run/component";

import { ProjectionRoot } from "./projection-root";
import type { TimelineData } from "../renderers/timeline/types";
import { buildTrackLayouts, TRACK_LIST_VERTICAL_PADDING } from "../lib/track-layout";

/** Compute total height of all tracks from the data. */
function computeTotalTrackHeight(data: TimelineData): number {
  const layouts = buildTrackLayouts(data.view.trackOrder, data.view.trackById);
  let total = 0;
  for (const layout of layouts.values()) {
    total = Math.max(total, Number(layout.y) + Number(layout.height));
  }
  return total + TRACK_LIST_VERTICAL_PADDING;
}

export function ProjectionContent(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);

  return (props: { children?: RemixNode; data: TimelineData; class?: string }) => {
    const h = computeTotalTrackHeight(props.data);

    return (
      <div
        css={{
          height: `${h}px`,
        }}
      >
        <div
          class="pointer-events-none sticky left-0"
          style={{
            width: projection.containerWidth ? `${projection.containerWidth}px` : "100%",
            height: `${h}px`,
          }}
        >
          {props.children}
        </div>
      </div>
    );
  };
}
