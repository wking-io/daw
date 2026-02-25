// clip-resize.ts — Pure clip resize state machine.
//
// Models the pending → resizing → idle lifecycle as a pure transition function.
// All state transitions are deterministic; side effects are expressed as data
// (ResizeEffect[]) to be interpreted by the driver layer.

import { Option, Schema } from "effect";
import * as N from "@daw/core/lib/numeric";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import { computeGridInterval } from "@daw/core/lib/ruler";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import type { TrackColor } from "../renderers/timeline/types";

const DEAD_ZONE_PX = 3;

// ---------------------------------------------------------------------------
// Resize edge
// ---------------------------------------------------------------------------

export const ResizeEdge = Schema.Literal("left", "right");
export type ResizeEdge = typeof ResizeEdge.Type;
export const decodeResizeEdge = Schema.decodeUnknownOption(ResizeEdge);

// ---------------------------------------------------------------------------
// Resize state (discriminated union)
// ---------------------------------------------------------------------------

type Idle = { phase: "idle" };

type Pending = {
  phase: "pending";
  clipId: string;
  edge: ResizeEdge;
  originSpan: Span.Span<QN.QN>;
  color: TrackColor;
  startClientX: number;
};

type Resizing = {
  phase: "resizing";
  clipId: string;
  edge: ResizeEdge;
  originSpan: Span.Span<QN.QN>;
  color: TrackColor;
  ghostSpan: Span.Span<QN.QN>;
};

export type ResizeState = Idle | Pending | Resizing;

export const idle: ResizeState = { phase: "idle" };

// ---------------------------------------------------------------------------
// Ghost (derived view)
// ---------------------------------------------------------------------------

export type ResizeGhostState = {
  clipId: string;
  edge: ResizeEdge;
  span: Span.Span<QN.QN>;
  originSpan: Span.Span<QN.QN>;
  color: TrackColor;
};

export function deriveResizeGhost(state: ResizeState): Option.Option<ResizeGhostState> {
  if (state.phase !== "resizing") return Option.none();

  return Option.some({
    clipId: state.clipId,
    edge: state.edge,
    span: state.ghostSpan,
    originSpan: state.originSpan,
    color: state.color,
  });
}

// ---------------------------------------------------------------------------
// Resize events (inputs to the state machine)
// ---------------------------------------------------------------------------

export type ResizeInput =
  | {
      type: "start-pending";
      clipId: string;
      edge: ResizeEdge;
      originSpan: Span.Span<QN.QN>;
      color: TrackColor;
      startClientX: Px.Px;
    }
  | { type: "pointer-move"; clientX: Px.Px }
  | { type: "pointer-up" }
  | { type: "escape" }
  | { type: "edge-scroll-tick"; dx: Px.Px };

// ---------------------------------------------------------------------------
// Resize effects (outputs / side-effect descriptors)
// ---------------------------------------------------------------------------

export type ResizeEffect =
  | { type: "set-cursor"; cursor: string }
  | { type: "clear-cursor" }
  | { type: "start-edge-scroll" }
  | { type: "stop-edge-scroll" }
  | { type: "pan-timeline"; delta: QN.QN }
  | { type: "commit"; clipId: string; span: Span.Span<QN.QN> }
  | { type: "request-update" };

// ---------------------------------------------------------------------------
// Transition context (read-only external data the transition needs)
// ---------------------------------------------------------------------------

export type ResizeTransitionContext = {
  containerRect: DOMRect;
  scale: number;
  screenToContentX: (x: Px.Px) => QN.QN;
  timeSignature: TimeSignature;
};

// ---------------------------------------------------------------------------
// Transition function
// ---------------------------------------------------------------------------

export type TransitionResult = {
  state: ResizeState;
  effects: ResizeEffect[];
};

export function transition(
  state: ResizeState,
  input: ResizeInput,
  ctx: ResizeTransitionContext,
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

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleStartPending(input: ResizeInput & { type: "start-pending" }): TransitionResult {
  return {
    state: {
      phase: "pending",
      clipId: input.clipId,
      edge: input.edge,
      originSpan: input.originSpan,
      color: input.color,
      startClientX: input.startClientX,
    },
    effects: [],
  };
}

function handlePointerMove(
  state: ResizeState,
  input: { clientX: number },
  ctx: ResizeTransitionContext,
): TransitionResult {
  if (state.phase === "pending") {
    const dx = Math.abs(input.clientX - state.startClientX);
    if (dx < DEAD_ZONE_PX) {
      return { state, effects: [] };
    }
    // Transition to resizing
    const resizing: Resizing = {
      phase: "resizing",
      clipId: state.clipId,
      edge: state.edge,
      originSpan: state.originSpan,
      color: state.color,
      ghostSpan: state.originSpan,
    };
    const ghostResult = updateGhost(resizing, input.clientX, ctx);
    return {
      state: ghostResult.state,
      effects: [
        { type: "set-cursor", cursor: "ew-resize" },
        { type: "start-edge-scroll" },
        { type: "request-update" },
      ],
    };
  }

  if (state.phase === "resizing") {
    const ghostResult = updateGhost(state, input.clientX, ctx);
    return {
      state: ghostResult.state,
      effects: [{ type: "request-update" }],
    };
  }

  return { state, effects: [] };
}

function handlePointerUp(state: ResizeState): TransitionResult {
  if (state.phase === "resizing") {
    // Only commit if the span actually changed
    const changed =
      !N.eq(state.ghostSpan.start, state.originSpan.start) ||
      !N.eq(state.ghostSpan.size, state.originSpan.size);

    if (changed) {
      return {
        state: idle,
        effects: [
          { type: "commit", clipId: state.clipId, span: state.ghostSpan },
          { type: "stop-edge-scroll" },
          { type: "clear-cursor" },
          { type: "request-update" },
        ],
      };
    }
  }
  return cancel(state);
}

function handleEscape(state: ResizeState): TransitionResult {
  if (state.phase !== "idle") return cancel(state);
  return { state, effects: [] };
}

function handleEdgeScrollTick(
  state: ResizeState,
  input: { dx: Px.Px },
  ctx: ResizeTransitionContext,
): TransitionResult {
  if (state.phase !== "resizing") return { state, effects: [] };

  const effects: ResizeEffect[] = [];

  if (Math.abs(input.dx) > 0.01) {
    const delta = QN.QN(input.dx / ctx.scale);
    effects.push({ type: "pan-timeline", delta });
    effects.push({ type: "request-update" });
  }

  return { state, effects };
}

// ---------------------------------------------------------------------------
// Ghost computation (pure)
// ---------------------------------------------------------------------------

function updateGhost(
  state: Resizing,
  clientX: number,
  ctx: ResizeTransitionContext,
): { state: ResizeState } {
  const pointerScreenX = Px.Px(clientX - ctx.containerRect.left);
  const pointerQN = ctx.screenToContentX(pointerScreenX);
  const snappedQN = snapToGrid(pointerQN, ctx.scale, ctx.timeSignature);

  const minSize = computeMinSize(ctx.scale, ctx.timeSignature);
  const originEnd = Span.end(state.originSpan);

  let ghostSpan: Span.Span<QN.QN>;

  if (state.edge === "right") {
    // Keep start fixed, change end
    const newEnd = N.max(N.add(state.originSpan.start, minSize), snappedQN);
    ghostSpan = Span.fromRange({ start: state.originSpan.start, end: newEnd });
  } else {
    // Keep end fixed, change start
    const maxStart = N.subtract(originEnd, minSize);
    const newStart = N.min(maxStart, N.max(QN.zero, snappedQN));
    ghostSpan = Span.fromRange({ start: newStart, end: originEnd });
  }

  return {
    state: { ...state, ghostSpan },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapToGrid(position: QN.QN, scale: number, timeSignature: TimeSignature): QN.QN {
  const { interval } = computeGridInterval({ scale, timeSignature });
  const raw = N.divide(position, interval);
  const snapped = N.multiply(interval, N.round(raw));
  return N.max(QN.zero, snapped);
}

function computeMinSize(scale: number, timeSignature: TimeSignature): QN.QN {
  const { interval } = computeGridInterval({ scale, timeSignature });
  return interval;
}

function cancel(state: ResizeState): TransitionResult {
  const effects: ResizeEffect[] = [{ type: "clear-cursor" }, { type: "request-update" }];
  if (state.phase === "resizing") {
    effects.unshift({ type: "stop-edge-scroll" });
  }
  return { state: idle, effects };
}
