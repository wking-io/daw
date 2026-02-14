import type { Handle, RemixNode } from "@remix-run/component";
import * as Projection from "@daw/core/lib/projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";
import { ProjectionContext } from "../lib/projection-context";

const DEFAULT_HEIGHT = 22;

class NavigatorContext extends ProjectionContext {
  override get scale() {
    if (this.containerWidth === 0) return 1;
    return Projection.scaleFor(QN.Numeric, this.timeline.size, this.containerWidth);
  }
  override contentToScreenX(x: QN.QN): Px.Px {
    return Projection.toScreen(QN.Numeric, QN.Numeric.zero, x, this.scale);
  }
  override screenToContentX(x: Px.Px): QN.QN {
    return Projection.fromScreen(QN.Numeric, QN.Numeric.zero, x, this.scale);
  }
  get zoomWindow(): Span.Span<Px.Px> {
    return Span.map(this.view, (v) =>
      Projection.toScreen(QN.Numeric, QN.Numeric.zero, v, this.scale),
    );
  }
}

export function NavigatorRoot(handle: Handle<NavigatorContext>) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  const navigatorCtx = new NavigatorContext(rootCtx.timeline);

  handle.context.set(navigatorCtx);

  return (props: { children?: RemixNode; height?: number; class?: string }) => {
    navigatorCtx.setTimeline(rootCtx.timeline);
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
