import type { Handle, Props } from "@remix-run/component";

import { makeProjection1D } from "../foundation/projection1d";
import type { Projection1D } from "../foundation/projection1d";
import * as Projection from "@daw/core/lib/projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Scroll from "@daw/core/lib/scroll";
import * as Timeline from "@daw/core/lib/timeline";
import { getPointerPosition } from "../utils/get-pointer-position";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";

export type ProjectionRootContext = {
  size: { width: number; height: number };
  scale: number;
  projection: Projection1D<QN.QN>;
  height: number;
  getPointerPosition: (e: PointerEvent) => { x: number; y: number };
  /** @internal Used by ProjectionContent */
  _connect: (node: HTMLDivElement, signal: AbortSignal) => void;
  /** @internal Used by ProjectionContent */
  _syncScroll: () => void;
  /** @internal Used by ProjectionContent */
  _contentWidth: number;
};

export function ProjectionRoot(handle: Handle<ProjectionRootContext>) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  let containerEl: HTMLDivElement | null = null;
  let size = { width: 0, height: 0 };
  let suppressScrollEvents = false;

  function getScale() {
    if (size.width === 0) return 1;
    return Projection.scaleFor(QN.Numeric, rootCtx.timeline.view.size, Px.Px(size.width));
  }

  function onScroll() {
    if (suppressScrollEvents || !containerEl) return;

    const scale = getScale();
    const nextStart = Scroll.fromScroll(QN.Numeric, Px.Px(containerEl.scrollLeft), scale);

    const nextTimeline = Timeline.panBy(
      QN.Numeric,
      rootCtx.timeline,
      QN.subtract(nextStart, rootCtx.timeline.view.start),
    );

    rootCtx.setTimeline(nextTimeline);
  }

  handle.context.set({
    get size() {
      return size;
    },
    get scale() {
      return getScale();
    },
    get projection() {
      return makeProjection1D({
        N: QN.Numeric,
        timeline: rootCtx.timeline,
        viewportWidthPx: Px.Px(size.width || 1),
      });
    },
    get height() {
      return size.height;
    },
    getPointerPosition(e: PointerEvent) {
      return getPointerPosition(e, containerEl);
    },
    _connect(node: HTMLDivElement, signal: AbortSignal) {
      containerEl = node;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          size = {
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height),
          };
          handle.update();
        }
      });
      observer.observe(node);
      signal.addEventListener("abort", () => observer.disconnect());

      node.addEventListener("scroll", onScroll, { signal });
    },
    _syncScroll() {
      if (!containerEl || rootCtx.isInteracting) return;

      const scale = getScale();
      const nextScrollLeft = Scroll.toScroll(QN.Numeric, rootCtx.timeline.view.start, scale);

      if (Math.abs(containerEl.scrollLeft - nextScrollLeft) < 0.5) return;

      suppressScrollEvents = true;
      containerEl.scrollLeft = nextScrollLeft;
      requestAnimationFrame(() => {
        suppressScrollEvents = false;
      });
    },
    get _contentWidth() {
      const scale = getScale();
      return Scroll.width(QN.Numeric, rootCtx.timeline.size, scale);
    },
  });

  return (props: Props<"div">) => {
    return <div {...props} />;
  };
}
