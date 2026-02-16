import type { Handle, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";

import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as Timeline from "@daw/core/lib/timeline";
import { deltaFrom, zoomFactorFromDelta } from "../utils/interaction-math";
import { NavigatorRoot } from "./navigator-root";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";

type Idle = { kind: "idle" };
type Pan = {
  kind: "pan";
  initialTimeline: Timeline.Timeline<QN.QN>;
  offset: QN.QN;
};

type Interaction = Idle | Pan;

const ZOOM_RATE = 350;

export function NavigatorTrack(handle: Handle) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  const navCtx = handle.context.get(NavigatorRoot);
  let interaction: Interaction = { kind: "idle" };

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = zoomFactorFromDelta(-e.deltaY, rootCtx.timeline.view.size);
    const nextTimeline = Timeline.zoomAt(
      QN.Numeric,
      rootCtx.timeline,
      factor,
      Span.center(QN.Numeric, rootCtx.timeline.view),
    );
    rootCtx.setTimeline(nextTimeline);
  }

  function handleSnap(e: PointerEvent) {
    const { currentTarget: el } = e;
    if (!(el instanceof Element)) return;
    e.preventDefault();

    el.setPointerCapture(e.pointerId);
    const pointer = navCtx.getPointerPosition(e);

    const offset = QN.divide(rootCtx.timeline.view.size, 2);
    const delta = deltaFrom(QN.Numeric, {
      x: Px.Px(pointer.x),
      scale: navCtx.scale,
      offset,
      from: rootCtx.timeline.view.start,
    });
    const nextTimeline = Timeline.panBy(QN.Numeric, rootCtx.timeline, delta);
    rootCtx.setTimeline(nextTimeline);
    rootCtx.setIsInteracting(true);
    interaction = {
      kind: "pan",
      initialTimeline: rootCtx.timeline,
      offset,
    };
  }

  function handlePan(e: PointerEvent) {
    const { currentTarget: el } = e;
    if (
      !(el instanceof Element) ||
      interaction.kind !== "pan" ||
      !el.hasPointerCapture(e.pointerId)
    ) {
      return;
    }

    el.setPointerCapture(e.pointerId);
    const pointer = navCtx.getPointerPosition(e);
    const delta = deltaFrom(QN.Numeric, {
      scale: navCtx.scale,
      x: Px.Px(pointer.x),
      offset: interaction.offset,
      from: rootCtx.timeline.view.start,
    });
    const nextTimeline = Timeline.panBy(QN.Numeric, rootCtx.timeline, delta);
    rootCtx.setTimeline(nextTimeline);
  }

  function handleInteractionEnd(e: PointerEvent) {
    const { currentTarget: el } = e;
    if (!(el instanceof Element) || !el.hasPointerCapture(e.pointerId)) {
      return;
    }
    el.releasePointerCapture(e.pointerId);
    interaction = { kind: "idle" };
    rootCtx.setIsInteracting(false);
  }

  return (props: { children?: RemixNode; class?: string }) => {
    return (
      <div
        draggable={false}
        on={{
          wheel: {
            listener: handleWheel,
            passive: false,
          },
          dragstart(e: DragEvent) {
            e.preventDefault();
          },
          pointerdown: handleSnap,
          pointermove: handlePan,
          pointerup: handleInteractionEnd,
        }}
        class={cn("group relative h-full w-full overflow-hidden", props.class)}
      >
        {props.children}
      </div>
    );
  };
}
