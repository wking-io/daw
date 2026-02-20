import type { Handle, Props } from "@remix-run/component";
import * as Projection from "@daw/core/lib/projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Scroll from "@daw/core/lib/scroll";
import * as Timeline from "@daw/core/lib/timeline";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";
import { cn } from "@daw/utils";
import { ProjectionContext, type ProjectionRules } from "../lib/projection-context";
import { zoomFactorFromDelta } from "../utils/interaction-math";

const timelineRules: ProjectionRules = {
  scale: (ctx) => {
    if (ctx.containerWidth === 0) return 1;
    return Projection.scaleFor(QN.Numeric, ctx.timeline.view.size, ctx.containerWidth);
  },
  origin: (ctx) => ctx.timeline.view.start,
};

export function ProjectionRoot(handle: Handle<ProjectionContext>) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);

  const projectionCtx: ProjectionContext = new ProjectionContext(rootCtx.timeline, timelineRules);
  handle.context.set(projectionCtx);

  // TODO: Make this more robust
  const isMac = navigator.platform.startsWith("Mac");

  let containerNode: HTMLElement | null = null;
  let suppressScrollEvents = false;

  let zoomAnchor: QN.QN | null = null;
  let zoomTimeout = 0;

  // TODO: Make this a generic helper for checking super key
  function isZoomModifier(e: WheelEvent) {
    // ctrlKey covers trackpad pinch (all platforms) and Ctrl+wheel (Windows/Linux)
    // metaKey covers Cmd+wheel (macOS)
    return e.ctrlKey || (isMac && e.metaKey);
  }

  // TODO: Extract individual event paths as helpers
  function onWheel(e: WheelEvent) {
    if (!containerNode) return;

    e.preventDefault();

    if (isZoomModifier(e)) {
      // Trackpad pinch / Ctrl+wheel / Cmd+wheel → zoom at pointer
      if (zoomAnchor === null) {
        const rect = containerNode.getBoundingClientRect();
        const pointerX = Px.Px(e.clientX - rect.left);
        zoomAnchor = projectionCtx.screenToContentX(pointerX);
      }

      clearTimeout(zoomTimeout);
      zoomTimeout = window.setTimeout(() => {
        zoomAnchor = null;
      }, 120);

      const factor = zoomFactorFromDelta(e.deltaY, rootCtx.timeline.view.size);
      const nextTimeline = Timeline.zoomAt(QN.Numeric, rootCtx.timeline, factor, zoomAnchor);
      rootCtx.setTimeline(nextTimeline);
    } else if (e.shiftKey) {
      // Shift+wheel → horizontal scroll only
      // Use whichever axis carries the delta (browsers may or may not swap axes)
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      containerNode.scrollLeft += delta;
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Dominant horizontal delta (tilt wheel, trackpad horizontal swipe) → horizontal scroll
      containerNode.scrollLeft += e.deltaX;
    } else {
      // Dominant vertical delta → vertical scroll only
      let el = e.target as HTMLElement | null;
      while (el && el !== containerNode) {
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop += e.deltaY;
          return;
        }
        el = el.parentElement;
      }
    }
  }

  function onScroll(e: Event) {
    if (
      suppressScrollEvents ||
      rootCtx.isInteracting ||
      e.currentTarget instanceof HTMLElement === false
    ) {
      return;
    }

    const nextStart = Scroll.fromScroll(
      QN.Numeric,
      Px.Px(e.currentTarget.scrollLeft),
      projectionCtx.scale,
    );

    const nextTimeline = Timeline.panBy(
      QN.Numeric,
      rootCtx.timeline,
      QN.subtract(nextStart, rootCtx.timeline.view.start),
    );

    rootCtx.setTimeline(nextTimeline);
  }

  return ({ class: classes, children, ...props }: Props<"div">) => {
    projectionCtx.setTimeline(rootCtx.timeline);

    // State → DOM: sync scroll position after render
    handle.queueTask(() => {
      if (!containerNode || rootCtx.isInteracting) return;

      const nextScrollLeft = Scroll.toScroll(
        QN.Numeric,
        rootCtx.timeline.view.start,
        projectionCtx.scale,
      );

      if (Math.abs(containerNode.scrollLeft - nextScrollLeft) < 0.5) return;

      suppressScrollEvents = true;
      containerNode.scrollLeft = nextScrollLeft;
      requestAnimationFrame(() => {
        suppressScrollEvents = false;
      });
    });

    return (
      <div
        connect={(node, signal) => {
          containerNode = node;
          projectionCtx.setContainer(node);

          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
              projectionCtx.setContainerWidth(Px.Px(Math.round(entry.contentRect.width)));
              handle.update();
            }
          });
          observer.observe(node);
          signal.addEventListener("abort", () => observer.disconnect());
        }}
        on={{
          scroll: onScroll,
          wheel: { listener: onWheel, passive: false },
        }}
        class={cn(
          "no-scrollbar relative overflow-x-auto overflow-y-hidden overscroll-x-none",
          classes,
        )}
        {...props}
      >
        {" "}
        <div class="h-0" style={{ width: `${Math.max(1, projectionCtx.contentWidth)}px` }} />
        {children}
      </div>
    );
  };
}
