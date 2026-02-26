import { Option } from "effect";
import * as N from "@daw/core/lib/numeric";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import type { TrackLayout } from "./track-layout";
import type { TrackColor } from "../renderers/timeline/types";
import { isOutOfBounds } from "./edge-scroll";
import { snapToGrid } from "./snap";

const DEAD_ZONE_PX = 3;

export function hitTestTrack(
  pointerY: Px.Px,
  trackLayouts: Map<string, TrackLayout>,
  trackOrder: readonly string[],
): Option.Option<string> {
  for (const trackId of trackOrder) {
    const layout = trackLayouts.get(trackId);
    if (!layout) continue;
    const bottom = N.add(layout.y, layout.height);
    if (N.gte(pointerY, layout.y) && N.lt(pointerY, bottom)) {
      return Option.some(trackId);
    }
  }
  return Option.none();
}

const COMPATIBLE_DROPS: ReadonlySet<string> = new Set(["midi:midi", "audio:audio"]);

export function isCompatibleDrop(
  clipPayloadKind: "midi" | "audio",
  targetTrackType: "midi" | "audio" | "bus",
): boolean {
  return COMPATIBLE_DROPS.has(`${clipPayloadKind}:${targetTrackType}`);
}

type Idle = { phase: "idle" };

type Pending = {
  phase: "pending";
  clipId: string;
  originTrackId: string;
  originSpan: Span.Span<QN.QN>;
  payloadKind: "midi" | "audio";
  color: TrackColor;
  width: Px.Px;
  height: Px.Px;
  grabOffset: QN.QN;
  grabOffsetY: Px.Px;
  startClientX: number;
  startClientY: number;
};

type Dragging = {
  phase: "dragging";
  clipId: string;
  originTrackId: string;
  originSpan: Span.Span<QN.QN>;
  payloadKind: "midi" | "audio";
  color: TrackColor;
  width: Px.Px;
  height: Px.Px;
  grabOffset: QN.QN;
  grabOffsetY: Px.Px;
  ghostStart: QN.QN;
  ghostTrackId: string;
  isValid: boolean;
  isOOB: boolean;
};

export type DragState = Idle | Pending | Dragging;

export const idle: DragState = { phase: "idle" };

export type GhostState = {
  clipId: string;
  start: QN.QN;
  trackId: string;
  width: Px.Px;
  height: Px.Px;
  color: TrackColor;
  isValid: boolean;
};

export function deriveGhost(
  state: DragState,
  trackById: Map<string, { color: TrackColor }>,
): Option.Option<GhostState> {
  if (state.phase !== "dragging") return Option.none();

  const startQN = state.isOOB ? state.originSpan.start : state.ghostStart;
  const trackId = state.isOOB ? state.originTrackId : state.ghostTrackId;

  // No ghost when the clip hasn't moved from its original position
  if (N.eq(startQN, state.originSpan.start) && trackId === state.originTrackId) {
    return Option.none();
  }

  const targetTrack = trackById.get(trackId);
  return Option.some({
    clipId: state.clipId,
    start: startQN,
    trackId,
    width: state.width,
    height: state.height,
    color: targetTrack?.color ?? state.color,
    isValid: state.isOOB ? false : state.isValid,
  });
}

export type DragInput =
  | {
      type: "start-pending";
      clipId: string;
      originTrackId: string;
      originSpan: Span.Span<QN.QN>;
      payloadKind: "midi" | "audio";
      color: TrackColor;
      width: Px.Px;
      height: Px.Px;
      grabOffset: QN.QN;
      grabOffsetY: Px.Px;
      startClientX: number;
      startClientY: number;
    }
  | { type: "pointer-move"; clientX: number; clientY: number }
  | { type: "pointer-up" }
  | { type: "escape" }
  | { type: "edge-scroll-tick"; dx: number; dy: number };

export type DragEffect =
  | { type: "set-cursor"; cursor: string }
  | { type: "clear-cursor" }
  | { type: "start-edge-scroll" }
  | { type: "stop-edge-scroll" }
  | { type: "pan-timeline"; delta: QN.QN }
  | { type: "scroll-vertical"; dy: number }
  | { type: "commit"; clipId: string; start: QN.QN; trackId: string }
  | { type: "request-update" };

export type TransitionContext = {
  containerRect: DOMRect;
  verticalRect: DOMRect;
  verticalScrollTop: number;
  scale: number;
  screenToContentX: (x: Px.Px) => QN.QN;
  timeSignature: TimeSignature;
  trackLayouts: Map<string, TrackLayout>;
  trackOrder: readonly string[];
  trackById: Map<string, { type: "midi" | "audio" | "bus"; color: TrackColor }>;
};

export type TransitionResult = {
  state: DragState;
  effects: DragEffect[];
};

export function transition(
  state: DragState,
  input: DragInput,
  ctx: TransitionContext,
): TransitionResult {
  switch (input.type) {
    case "start-pending":
      return handleStartPending(input);

    case "pointer-move":
      return handlePointerMove(state, input, ctx);

    case "pointer-up":
      return handlePointerUp(state);

    case "escape":
      return handleEscape(state);

    case "edge-scroll-tick":
      return handleEdgeScrollTick(state, input, ctx);
  }
}

function handleStartPending(input: DragInput & { type: "start-pending" }): TransitionResult {
  return {
    state: {
      phase: "pending",
      clipId: input.clipId,
      originTrackId: input.originTrackId,
      originSpan: input.originSpan,
      payloadKind: input.payloadKind,
      color: input.color,
      width: input.width,
      height: input.height,
      grabOffset: input.grabOffset,
      grabOffsetY: input.grabOffsetY,
      startClientX: input.startClientX,
      startClientY: input.startClientY,
    },
    effects: [],
  };
}

function handlePointerMove(
  state: DragState,
  input: { clientX: number; clientY: number },
  ctx: TransitionContext,
): TransitionResult {
  if (state.phase === "pending") {
    const dx = input.clientX - state.startClientX;
    const dy = input.clientY - state.startClientY;
    if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE_PX) {
      return { state, effects: [] };
    }
    // Transition to dragging
    const dragging: Dragging = {
      phase: "dragging",
      clipId: state.clipId,
      originTrackId: state.originTrackId,
      originSpan: state.originSpan,
      payloadKind: state.payloadKind,
      color: state.color,
      width: state.width,
      height: state.height,
      grabOffset: state.grabOffset,
      grabOffsetY: state.grabOffsetY,
      ghostStart: state.originSpan.start,
      ghostTrackId: state.originTrackId,
      isValid: true,
      isOOB: false,
    };
    const ghostResult = updateGhost(dragging, input.clientX, input.clientY, ctx);
    return {
      state: ghostResult.state,
      effects: [
        { type: "set-cursor", cursor: "grabbing" },
        { type: "start-edge-scroll" },
        { type: "request-update" },
      ],
    };
  }

  if (state.phase === "dragging") {
    const ghostResult = updateGhost(state, input.clientX, input.clientY, ctx);
    return {
      state: ghostResult.state,
      effects: [...ghostResult.effects, { type: "request-update" }],
    };
  }

  return { state, effects: [] };
}

function handlePointerUp(state: DragState): TransitionResult {
  if (state.phase === "dragging" && state.isValid && !state.isOOB) {
    return {
      state: idle,
      effects: [
        {
          type: "commit",
          clipId: state.clipId,
          start: state.ghostStart,
          trackId: state.ghostTrackId,
        },
        { type: "stop-edge-scroll" },
        { type: "clear-cursor" },
        { type: "request-update" },
      ],
    };
  }
  return cancel(state);
}

function handleEscape(state: DragState): TransitionResult {
  if (state.phase !== "idle") return cancel(state);
  return { state, effects: [] };
}

function handleEdgeScrollTick(
  state: DragState,
  input: { dx: number; dy: number },
  ctx: TransitionContext,
): TransitionResult {
  if (state.phase !== "dragging") return { state, effects: [] };

  const effects: DragEffect[] = [];
  let needsGhostUpdate = false;

  if (Math.abs(input.dx) > 0.01) {
    const deltaQN = QN.QN(input.dx / ctx.scale);
    effects.push({ type: "pan-timeline", delta: deltaQN });
    needsGhostUpdate = true;
  }

  if (Math.abs(input.dy) > 0.01) {
    effects.push({ type: "scroll-vertical", dy: input.dy });
    needsGhostUpdate = true;
  }

  if (!needsGhostUpdate) return { state, effects };

  // Ghost update must be deferred — the pan/scroll effects change the context
  // that updateGhost reads. The driver applies effects first, then feeds a
  // follow-up pointer-move with the last pointer position.
  effects.push({ type: "request-update" });
  return { state, effects };
}

function updateGhost(
  state: Dragging,
  clientX: number,
  clientY: number,
  ctx: TransitionContext,
): { state: DragState; effects: DragEffect[] } {
  // Check out-of-bounds
  if (isOutOfBounds(clientX, clientY, ctx.verticalRect)) {
    return {
      state: { ...state, isOOB: true },
      effects: [{ type: "set-cursor", cursor: "not-allowed" }],
    };
  }

  // Compute snapped QN position
  const pointerScreenX = Px.Px(clientX - ctx.containerRect.left);
  const pointerQN = ctx.screenToContentX(pointerScreenX);
  const rawStartQN = N.subtract(pointerQN, state.grabOffset);
  const snappedStartQN = snapToGrid(rawStartQN, ctx.scale, ctx.timeSignature);

  // Hit-test track
  const pointerTrackY = Px.Px(clientY - ctx.verticalRect.top + ctx.verticalScrollTop);
  const targetTrackId = hitTestTrack(pointerTrackY, ctx.trackLayouts, ctx.trackOrder);
  const ghostTrackId = Option.getOrElse(targetTrackId, () => state.ghostTrackId);

  // Check compatibility
  const targetTrack = ctx.trackById.get(ghostTrackId);
  const valid = targetTrack ? isCompatibleDrop(state.payloadKind, targetTrack.type) : false;

  return {
    state: {
      ...state,
      ghostStart: snappedStartQN,
      ghostTrackId,
      isValid: valid,
      isOOB: false,
    },
    effects: [{ type: "set-cursor", cursor: valid ? "grabbing" : "not-allowed" }],
  };
}

function cancel(state: DragState): TransitionResult {
  const effects: DragEffect[] = [{ type: "clear-cursor" }, { type: "request-update" }];
  if (state.phase === "dragging") {
    effects.unshift({ type: "stop-edge-scroll" });
  }
  return { state: idle, effects };
}
