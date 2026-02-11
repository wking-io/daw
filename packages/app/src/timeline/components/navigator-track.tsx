import type { Handle, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";

import * as Projection from "../lib/projection";
import * as Px from "../lib/px";
import * as Span from "../lib/span";
import * as Timeline from "../lib/timeline";
import { NavigatorRoot } from "./navigator-root";
import type { NavigatorRootContext } from "./navigator-root";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";

type Idle = { kind: "idle" };
type Pan = {
  kind: "pan";
  initialTimeline: Timeline.Timeline<Px.Px>;
  offset: Px.Px;
};

type Interaction = Idle | Pan;

export function NavigatorTrack(handle: Handle) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  const navCtx: NavigatorRootContext = handle.context.get(NavigatorRoot);
  let interaction: Interaction = { kind: "idle" };

  return (props: { zoomRate?: number; children?: RemixNode; class?: string }) => {
    const zoomRate = props.zoomRate ?? 350;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = factorFromDelta(e.deltaY, zoomRate);
      const nextTimeline = Timeline.zoomAt(
        Px.Numeric,
        rootCtx.timeline,
        factor,
        Span.center(Px.Numeric, rootCtx.timeline.view),
      );
      rootCtx.setTimeline(nextTimeline);
    }

    function handleSnap(e: PointerEvent) {
      const el = navCtx.containerEl;
      if (!el) return;
      e.preventDefault();

      el.setPointerCapture(e.pointerId);
      const pointer = navCtx.getPointerPosition(e);

      const offset = Px.divide(rootCtx.timeline.view.size, 2);
      const delta = deltaFrom({
        x: Px.Px(pointer.x),
        scale: navCtx.scale,
        offset,
        from: rootCtx.timeline.view.start,
      });
      const nextTimeline = Timeline.panBy(Px.Numeric, rootCtx.timeline, delta);
      rootCtx.setTimeline(nextTimeline);
      rootCtx.setIsInteracting(true);
      interaction = {
        kind: "pan",
        initialTimeline: rootCtx.timeline,
        offset,
      };
    }

    function handlePan(e: PointerEvent) {
      const el = navCtx.containerEl;
      if (interaction.kind !== "pan" || !el || !el.hasPointerCapture(e.pointerId)) {
        return;
      }

      el.setPointerCapture(e.pointerId);
      const pointer = navCtx.getPointerPosition(e);
      const delta = deltaFrom({
        scale: navCtx.scale,
        x: Px.Px(pointer.x),
        offset: interaction.offset,
        from: rootCtx.timeline.view.start,
      });
      const nextTimeline = Timeline.panBy(Px.Numeric, rootCtx.timeline, delta);
      rootCtx.setTimeline(nextTimeline);
    }

    function handleInteractionEnd(e: PointerEvent) {
      const el = navCtx.containerEl;
      if (!el || !el.hasPointerCapture(e.pointerId)) {
        return;
      }
      el.releasePointerCapture(e.pointerId);
      interaction = { kind: "idle" };
      rootCtx.setIsInteracting(false);
    }

    return (
      <div
        connect={(node: HTMLDivElement, signal: AbortSignal) => {
          node.addEventListener("wheel", handleWheel, {
            passive: false,
            signal,
          });
        }}
        draggable={false}
        on={{
          wheel: {
            listener: handleWheel,
            passive: false,
            signal,
          },
          dragstart(e: DragEvent) {
            e.preventDefault();
          },
          pointerdown: handleSnap,
          pointermove: handlePan,
          pointerup: handleInteractionEnd,
        }}
        class={cn("timeline group relative h-full w-full overflow-hidden", props.class)}
      >
        {props.children}
      </div>
    );
  };
}

function deltaFrom({
  x,
  scale,
  offset,
  from,
}: {
  x: Px.Px;
  offset: Px.Px;
  scale: number;
  from?: Px.Px;
}): Px.Px {
  const N = Px.Numeric;
  const at = Projection.fromScreen(N, N.zero, x, scale);
  const nextStart = N.subtract(at, offset);
  return N.subtract(nextStart, from ?? N.zero);
}

function factorFromDelta(dy: number, rate = 350): number {
  return Math.pow(2, dy / rate);
}
