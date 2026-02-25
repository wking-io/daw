import type { Handle } from "@remix-run/component";

import { ProjectionRoot } from "./projection-root";
import { TimelineRoot } from "./timeline-root";

export function PlayheadLine(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);
  const rootCtx = handle.context.get(TimelineRoot);

  handle.on(projection, { change: () => handle.update() });

  return () => {
    const pos = rootCtx.transport.playheadPosition;
    const screenX = Number(projection.contentToScreenX(pos));

    if (screenX < 0 || screenX > projection.containerWidth) return null;

    return (
      <div
        class="absolute top-0 bottom-0 pointer-events-none z-30"
        style={{
          left: `${screenX}px`,
          width: "1px",
          backgroundColor: "var(--color-foreground)",
        }}
      />
    );
  };
}
