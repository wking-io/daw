import type { Handle, RemixNode } from "@remix-run/component";
import * as Projection from "@daw/core/lib/projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";
import { ProjectionContext, type ProjectionRules } from "../lib/projection-context";

const DEFAULT_HEIGHT = 22;

const navigatorRules: ProjectionRules = {
  scale: (ctx) => {
    if (ctx.containerWidth === 0) return 1;
    return Projection.scaleFor(QN.Numeric, ctx.timeline.size, ctx.containerWidth);
  },
  origin: () => QN.Numeric.zero,
};

class NavigatorContext extends ProjectionContext {
  get zoomWindow(): Span.Span<Px.Px> {
    return Span.map(this.view, (v) =>
      Projection.toScreen(QN.Numeric, QN.Numeric.zero, v, this.scale),
    );
  }
}

export function NavigatorRoot(handle: Handle<NavigatorContext>) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  const navigatorCtx = new NavigatorContext(() => rootCtx.timeline, navigatorRules);

  handle.context.set(navigatorCtx);

  return (props: { children?: RemixNode; height?: number; class?: string }) => {
    navigatorCtx.notifyChange();
    const h = props.height ?? DEFAULT_HEIGHT;

    return (
      <div
        connect={(node: HTMLDivElement, signal: AbortSignal) => {
          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
              navigatorCtx.setContainerWidth(Px.Px(Math.round(entry.contentRect.width)));
              handle.update();
            }
          });
          observer.observe(node);
          signal.addEventListener("abort", () => observer.disconnect());
        }}
        class={props.class}
        style={{ height: `${h}px` }}
      >
        {props.children}
      </div>
    );
  };
}
