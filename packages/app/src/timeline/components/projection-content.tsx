import type { Handle, RemixNode } from "@remix-run/component";

import { ProjectionRoot } from "./projection-root";

const DEFAULT_HEIGHT = 240;

export function ProjectionContent(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);

  handle.on(projection, { change: () => handle.update() });

  return (props: { children?: RemixNode; height?: number; class?: string }) => {
    const h = props.height ?? DEFAULT_HEIGHT;

    return (
      <div
        css={{
          height: `${h}px`,
        }}
      >
        <div
          class="pointer-events-none sticky top-0 left-0"
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
