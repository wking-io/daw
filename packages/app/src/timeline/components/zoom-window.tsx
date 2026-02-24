import type { Handle } from "@remix-run/component";
import { cn } from "@daw/utils";

import * as Projection from "@daw/core/lib/projection";
import * as N from "@daw/core/lib/numeric";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as Timeline from "@daw/core/lib/timeline";
import { deltaFrom, zoomFactorFromDelta } from "../utils/interaction-math";
import { NavigatorRoot } from "./navigator-root";
import { TimelineRoot } from "./timeline-root";
import type { TimelineRootContext } from "./timeline-root";

const MIN_ZOOM_WINDOW_PX = Px.Px(20);

type Direction = "L" | "R";
type Anchor = "L" | "R" | "center";

function clampZoomWindow(
  raw: Span.Span<Px.Px>,
  containerWidth: Px.Px,
  anchor: Anchor,
): Span.Span<Px.Px> {
  if (raw.size >= MIN_ZOOM_WINDOW_PX) {
    return raw;
  }

  const minPx = Px.Px(MIN_ZOOM_WINDOW_PX);
  const max = N.subtract(containerWidth, minPx);
  let start: Px.Px;

  if (anchor === "L") {
    // Right edge stays fixed
    start = N.subtract(N.add(raw.start, raw.size), minPx);
  } else if (anchor === "R") {
    // Left edge stays fixed
    start = raw.start;
  } else {
    // Center on the raw midpoint
    start = Px.Px(Number(raw.start) + Number(raw.size) / 2 - MIN_ZOOM_WINDOW_PX / 2);
  }

  return Span.make(N.clamp(start, Px.zero, max), MIN_ZOOM_WINDOW_PX);
}

type Idle = { kind: "idle" };
type Pan<A extends number> = {
  kind: "pan";
  initialTimeline: Timeline.Timeline<A>;
  offset: A;
};
type Resize<A extends number> = {
  kind: "resize";
  initialTimeline: Timeline.Timeline<A>;
  direction: Direction;
  pointerOffset: A;
};
type Zoom<A extends number> = {
  kind: "zoom";
  initialTimeline: Timeline.Timeline<A>;
};

type Interaction<A extends number> = Idle | Pan<A> | Resize<A> | Zoom<A>;

// WebKit shows a disruptive message with pointer lock, so we skip it
const isWebKit =
  typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export function ZoomWindow(handle: Handle) {
  const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot);
  const projection = handle.context.get(NavigatorRoot);
  let isAltKeyPressed = false;
  let interaction: Interaction<QN.QN> = { kind: "idle" };

  // Scrub state
  let isScrubbing = false;
  let cumulativeDelta = 0;

  handle.on(projection, { change: () => handle.update() });

  // Track Alt key globally
  handle.on(window, {
    keydown(e: KeyboardEvent) {
      if (e.key === "Alt") {
        isAltKeyPressed = true;
        handle.update();
      }
    },
    keyup(e: KeyboardEvent) {
      if (e.key === "Alt") {
        isAltKeyPressed = false;
        handle.update();
      }
    },
  });

  // Scrub handlers (inline version of useScrub)
  function handleScrubMove(event: PointerEvent) {
    if (!isScrubbing) return;
    event.preventDefault();
    cumulativeDelta += event.movementY;

    // Handle zoom
    if (interaction.kind !== "zoom") return;
    const { initialTimeline } = interaction;
    const factor = zoomFactorFromDelta(cumulativeDelta, projection.view.size);
    const nextTimeline = Timeline.zoomAt(
      initialTimeline,
      factor,
      Span.center(initialTimeline.view),
    );
    rootCtx.setTimeline(nextTimeline);
  }

  function handleScrubUp() {
    if (!isScrubbing) return;
    isScrubbing = false;

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    if (interaction.kind === "zoom") {
      interaction = { kind: "idle" };
      rootCtx.setIsInteracting(false);
    }

    window.removeEventListener("pointermove", handleScrubMove, true);
    window.removeEventListener("pointerup", handleScrubUp, true);
  }

  async function handleScrubStart(event: PointerEvent) {
    const isMainButton = event.button === 0;
    if (!isMainButton || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();

    cumulativeDelta = 0;
    isScrubbing = true;

    // Start zoom interaction
    interaction = { kind: "zoom", initialTimeline: rootCtx.timeline };
    rootCtx.setIsInteracting(true);

    window.addEventListener("pointermove", handleScrubMove, true);
    window.addEventListener("pointerup", handleScrubUp, true);

    if (!isWebKit) {
      try {
        await document.body.requestPointerLock();
      } catch {
        // Pointer lock denied, continue without it
      }
    }
  }

  return (props: { class?: string }) => {
    function handlePanStart(e: PointerEvent) {
      const { currentTarget: el } = e;
      if (!(el instanceof Element)) return;
      e.preventDefault();
      e.stopPropagation();

      el.setPointerCapture(e.pointerId);
      const pointer = projection.getPointerPosition(e);
      const offset = deltaFrom({
        x: Px.Px(pointer.x),
        scale: projection.scale,
        offset: projection.view.start,
      });
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

      const pointer = projection.getPointerPosition(e);
      const delta = deltaFrom({
        scale: projection.scale,
        x: Px.Px(pointer.x),
        offset: interaction.offset,
        from: rootCtx.timeline.view.start,
      });
      const nextTimeline = Timeline.panBy(rootCtx.timeline, delta);
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

    function handleResizeStart(direction: Direction) {
      return (e: PointerEvent) => {
        const { currentTarget } = e;
        if (!(currentTarget instanceof Element) || !currentTarget.parentElement) return;
        const el = currentTarget.parentElement;
        e.preventDefault();
        e.stopPropagation();

        el.setPointerCapture(e.pointerId);

        // Capture offset between pointer and the real view edge so the
        // first resize event produces zero delta (avoids a jump when the
        // zoom window is visually clamped to MIN_ZOOM_WINDOW_PX).
        const pointer = projection.getPointerPosition(e);
        const pointerTimelinePos = Projection.from(QN.zero, Px.Px(pointer.x), projection.scale);
        const edge =
          direction === "L" ? rootCtx.timeline.view.start : Span.end(rootCtx.timeline.view);
        const pointerOffset = N.subtract(pointerTimelinePos, edge);

        interaction = {
          kind: "resize",
          direction,
          initialTimeline: rootCtx.timeline,
          pointerOffset,
        };
      };
    }

    function handleResize(e: PointerEvent) {
      const { currentTarget: el } = e;
      if (
        !(el instanceof Element) ||
        interaction.kind !== "resize" ||
        !el.hasPointerCapture(e.pointerId)
      ) {
        return;
      }

      const pointer = projection.getPointerPosition(e);
      const pointerTimelinePos = Projection.from(QN.zero, Px.Px(pointer.x), projection.scale);

      const adjusted = N.subtract(pointerTimelinePos, interaction.pointerOffset);

      // Enforce visual min: resize cannot shrink the view below what
      // MIN_ZOOM_WINDOW_PX represents at the current navigator scale.
      const visualMin = QN.QN(MIN_ZOOM_WINDOW_PX / projection.scale);
      const effectiveMin = N.max(rootCtx.timeline.min, visualMin);
      const constrained = { ...rootCtx.timeline, min: effectiveMin };

      if (interaction.direction === "L") {
        const delta = N.subtract(adjusted, rootCtx.timeline.view.start);
        const nextTimeline = Timeline.resizeLeftBy(constrained, delta);
        rootCtx.setTimeline({ ...nextTimeline, min: rootCtx.timeline.min });
      } else {
        const delta = N.subtract(adjusted, Span.end(rootCtx.timeline.view));
        const nextTimeline = Timeline.resizeRightBy(constrained, delta);
        rootCtx.setTimeline({ ...nextTimeline, min: rootCtx.timeline.min });
      }
    }

    function handlePickMoveEvent(e: PointerEvent) {
      return interaction.kind === "resize" ? handleResize(e) : handlePan(e);
    }

    const anchor: Anchor = interaction.kind === "resize" ? interaction.direction : "center";
    const zoomWindow = clampZoomWindow(projection.zoomWindow, projection.containerWidth, anchor);

    return (
      <div
        data-zoom-window
        draggable={false}
        on={{
          pointerdown: isAltKeyPressed ? handleScrubStart : handlePanStart,
          pointermove: handlePickMoveEvent,
          pointerup: handleInteractionEnd,
        }}
        class={cn(
          "group/zoom-window absolute top-0 bottom-0 rounded-[3px] border border-zoom-control group-data-active:border-zoom-control-active hover:border-zoom-control-active ring-1 ring-layer-1",
          isAltKeyPressed ? "cursor-zoom-out" : "cursor-move",
          props.class,
        )}
        style={{
          left: `${zoomWindow.start}px`,
          width: `${zoomWindow.size}px`,
        }}
      >
        {/* Left resize handle */}
        <div
          data-zoom-handle
          on={{ pointerdown: handleResizeStart("L") }}
          class="absolute top-0 bottom-0 -left-1 w-2.5 cursor-ew-resize"
        >
          <div class="absolute top-1/2 left-1 h-3/4 w-0.5 -translate-y-1/2 rounded-r-[2px] group-hover/zoom-window:bg-zoom-control-active" />
        </div>
        {/* Right resize handle */}
        <div
          data-zoom-handle
          on={{ pointerdown: handleResizeStart("R") }}
          class="absolute top-0 -right-1 bottom-0 w-2.5 cursor-ew-resize"
        >
          <div class="absolute top-1/2 right-1 h-3/4 w-0.5 -translate-y-1/2 rounded-l-[2px] group-hover/zoom-window:bg-zoom-control-active" />
        </div>
      </div>
    );
  };
}
