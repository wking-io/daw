import type { Handle, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";

import { ProjectionRoot } from "./projection-root";
import type { ProjectionRootContext } from "./projection-root";

const DEFAULT_HEIGHT = 240;

export function ProjectionContent(handle: Handle) {
  const projCtx: ProjectionRootContext = handle.context.get(ProjectionRoot);

  return (props: { children?: RemixNode; height?: number; class?: string }) => {
    const h = props.height ?? DEFAULT_HEIGHT;

    // State → DOM: sync scroll position after render
    handle.queueTask(() => {
      projCtx._syncScroll();
    });

    return (
      <div
        connect={projCtx._connect}
        class={cn("no-scrollbar relative overflow-x-auto overflow-y-hidden", props.class)}
        style={{
          height: `${h}px`,
          overscrollBehaviorX: "none",
        }}
      >
        {/* Spacer defines scroll range */}
        <div class="h-0" style={{ width: `${Math.max(1, projCtx._contentWidth)}px` }} />
        {/* Content container */}
        <div
          class="pointer-events-none sticky top-0 left-0"
          style={{
            width: projCtx.size.width ? `${projCtx.size.width}px` : "100%",
            height: `${h}px`,
          }}
        >
          {props.children}
        </div>
      </div>
    );
  };
}
