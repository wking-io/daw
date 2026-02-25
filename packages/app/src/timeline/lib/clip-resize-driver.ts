import * as QN from "@daw/core/lib/qn";
import * as Px from "@daw/core/lib/px";
import * as Span from "@daw/core/lib/span";
import * as Timeline from "@daw/core/lib/timeline";
import type { ProjectionContext } from "./projection-context";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import type { TrackColor } from "../renderers/timeline/types";
import {
  type ResizeState,
  type ResizeEffect,
  type ResizeInput,
  type ResizeTransitionContext,
  type ResizeEdge,
  idle,
  transition,
  deriveResizeGhost,
} from "./clip-resize";
import { CursorOverride, EdgeScrollDriver } from "./interaction-drivers";

export type ResizeCommitCallback = (clipId: string, span: Span.Span<QN.QN>) => void;
export type UpdateCallback = () => void;
export type SetTimeline = (next: Timeline.Timeline<QN.QN>) => void;

export type ResizeRenderData = {
  timeSignature: TimeSignature;
  onCommit: ResizeCommitCallback;
};

export class ClipResizeDriver {
  #state: ResizeState = idle;

  // Stable dependencies (set once at construction)
  #projection: ProjectionContext;
  #setTimeline: SetTimeline;
  #onUpdate: UpdateCallback;

  // Per-render data (updated atomically via sync())
  #data: ResizeRenderData | null = null;

  // Sub-drivers
  #cursor = new CursorOverride();
  #edgeScroll: EdgeScrollDriver;
  #lastPointerClientX = Px.zero;

  constructor({
    projection,
    setTimeline,
    onUpdate,
  }: {
    projection: ProjectionContext;
    setTimeline: SetTimeline;
    onUpdate: UpdateCallback;
  }) {
    this.#projection = projection;
    this.#setTimeline = setTimeline;
    this.#onUpdate = onUpdate;
    this.#edgeScroll = new EdgeScrollDriver(
      () => this.#projection.getContainerRect(),
      () => this.#projection.getContainerRect(), // horizontal-only: reuse same rect
    );
  }

  sync(data: ResizeRenderData) {
    this.#data = data;
  }

  // ---- Public state accessors ----

  get state() {
    return this.#state;
  }

  get ghost() {
    return deriveResizeGhost(this.#state);
  }

  get isResizing(): boolean {
    return this.#state.phase !== "idle";
  }

  get resizeSourceClipId(): string | null {
    return this.#state.phase !== "idle" ? this.#state.clipId : null;
  }

  // ---- Event handlers (called from component) ----

  startPending(
    clipId: string,
    edge: ResizeEdge,
    e: PointerEvent,
    originSpan: Span.Span<QN.QN>,
    color: TrackColor,
  ) {
    this.#dispatch({
      type: "start-pending",
      clipId,
      edge,
      originSpan,
      color,
      startClientX: Px.Px(e.clientX),
    });
  }

  onPointerMove(e: PointerEvent) {
    this.#lastPointerClientX = Px.Px(e.clientX);
    this.#edgeScroll.updatePointer(e.clientX, e.clientY);
    this.#dispatch({ type: "pointer-move", clientX: Px.Px(e.clientX) });
  }

  onPointerUp(_e: PointerEvent) {
    this.#dispatch({ type: "pointer-up" });
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && this.#state.phase !== "idle") {
      this.#dispatch({ type: "escape" });
    }
  }

  // ---- Core dispatch loop ----

  #dispatch(input: ResizeInput) {
    const ctx = this.#buildContext();
    if (!ctx) return;

    const result = transition(this.#state, input, ctx);
    this.#state = result.state;
    this.#interpretEffects(result.effects);
  }

  #buildContext(): ResizeTransitionContext | null {
    const containerRect = this.#projection.getContainerRect();
    if (!containerRect || !this.#data) return null;

    return {
      containerRect,
      scale: this.#projection.scale,
      screenToContentX: (x) => this.#projection.screenToContentX(x),
      timeSignature: this.#data.timeSignature,
    };
  }

  // ---- Effect interpreter ----

  #interpretEffects(effects: ResizeEffect[]) {
    for (const effect of effects) {
      switch (effect.type) {
        case "set-cursor":
          this.#cursor.set(effect.cursor);
          break;

        case "clear-cursor":
          this.#cursor.clear();
          break;

        case "start-edge-scroll":
          this.#edgeScroll.start((dx, _dy) => {
            this.#handleEdgeScrollTick(dx);
          });
          break;

        case "stop-edge-scroll":
          this.#edgeScroll.stop();
          break;

        case "pan-timeline": {
          const nextTimeline = Timeline.panBy(this.#projection.timeline, effect.delta);
          this.#setTimeline(nextTimeline);
          break;
        }

        case "commit":
          this.#data?.onCommit(effect.clipId, effect.span);
          break;

        case "request-update":
          this.#onUpdate();
          break;
      }
    }
  }

  // ---- Edge scroll tick handler ----

  #handleEdgeScrollTick(dx: Px.Px) {
    if (this.#state.phase !== "resizing") return;

    const ctx = this.#buildContext();
    if (!ctx) return;

    const result = transition(this.#state, { type: "edge-scroll-tick", dx }, ctx);
    this.#state = result.state;
    this.#interpretEffects(result.effects);

    // After pan effects have been applied, recompute the ghost
    if (this.#state.phase === "resizing") {
      const freshCtx = this.#buildContext();
      if (freshCtx) {
        const moveResult = transition(
          this.#state,
          { type: "pointer-move", clientX: this.#lastPointerClientX },
          freshCtx,
        );
        this.#state = moveResult.state;
        this.#interpretEffects(moveResult.effects);
      }
    }
  }
}
