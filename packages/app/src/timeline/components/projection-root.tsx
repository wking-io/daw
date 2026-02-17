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

  let containerNode: HTMLElement | null = null;
  let suppressScrollEvents = false;

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
          // wheel: { listener: onWheel, passive: false },
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
