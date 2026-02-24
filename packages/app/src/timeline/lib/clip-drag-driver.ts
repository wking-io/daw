import * as N from "@daw/core/lib/numeric";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Timeline from "@daw/core/lib/timeline";
import * as Span from "@daw/core/lib/span";
import type { ProjectionContext } from "./projection-context";
import type { TrackLayout } from "./track-layout";
import type { TrackColor } from "../renderers/timeline/types";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import {
  type DragState,
  type DragEffect,
  type DragInput,
  type TransitionContext,
  idle,
  transition,
  deriveGhost,
} from "./clip-drag";
import { CursorOverride, EdgeScrollDriver } from "./interaction-drivers";
import type { ProjectView } from "@daw/core/domain/project-view";

export type CommitCallback = (clipId: string, newStart: QN.QN, newTrackId: string) => void;
export type UpdateCallback = () => void;
export type SetTimeline = (next: Timeline.Timeline<QN.QN>) => void;

export type RenderData = {
  timeSignature: TimeSignature;
  trackLayouts: Map<string, TrackLayout>;
  trackOrder: readonly string[];
  trackById: ProjectView["trackById"];
  onCommit: CommitCallback;
};

// ---------------------------------------------------------------------------
// ClipDragDriver
// ---------------------------------------------------------------------------

export class ClipDragDriver {
  #state: DragState = idle;

  // Stable dependencies (set once at construction)
  #projection: ProjectionContext;
  #setTimeline: SetTimeline;
  #onUpdate: UpdateCallback;

  // Per-render data (updated atomically via sync())
  #data: RenderData | null = null;

  // Sub-drivers
  #cursor = new CursorOverride();
  #edgeScroll: EdgeScrollDriver;
  #verticalContainer: HTMLElement | null = null;
  #lastPointerClientX = 0;
  #lastPointerClientY = 0;

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
      () => this.#verticalContainer?.getBoundingClientRect() ?? null,
    );
  }

  sync(data: RenderData) {
    this.#data = data;
  }

  // ---- Public state accessors ----

  get state() {
    return this.#state;
  }

  get ghost() {
    if (!this.#data) return deriveGhost(this.#state, new Map());
    return deriveGhost(this.#state, this.#data.trackById);
  }

  get isDragging(): boolean {
    return this.#state.phase !== "idle";
  }

  get dragSourceClipId(): string | null {
    return this.#state.phase !== "idle" ? this.#state.clipId : null;
  }

  setVerticalContainer(el: HTMLElement | null) {
    this.#verticalContainer = el;
  }

  // ---- Event handlers (called from component) ----

  startPending(
    clipId: string,
    e: PointerEvent,
    clip: {
      originTrackId: string;
      origin: Span.Span<QN.QN>;
      payloadKind: "midi" | "audio";
      color: TrackColor;
      width: Px.Px;
      height: Px.Px;
    },
  ) {
    const containerRect = this.#projection.getContainerRect();
    if (!containerRect) return;

    // Compute grab offset: where within the clip the pointer landed (in QN)
    const pointerScreenX = Px.Px(e.clientX - containerRect.left);
    const pointerQN = this.#projection.screenToContentX(pointerScreenX);
    const grabOffsetQN = N.subtract(pointerQN, clip.origin.start);

    // Vertical grab offset
    const trackLayout = this.#data?.trackLayouts.get(clip.originTrackId);
    const vertScrollTop = this.#verticalContainer?.scrollTop ?? 0;
    const trackListRect = this.#verticalContainer?.getBoundingClientRect();
    const pointerTrackY = trackListRect ? e.clientY - trackListRect.top + vertScrollTop : 0;
    const grabOffsetY = Px.Px(trackLayout ? pointerTrackY - (trackLayout.y as number) : 0);

    this.#dispatch({
      type: "start-pending",
      clipId,
      originTrackId: clip.originTrackId,
      originSpan: clip.origin,
      payloadKind: clip.payloadKind,
      color: clip.color,
      width: clip.width,
      height: clip.height,
      grabOffset: grabOffsetQN,
      grabOffsetY,
      startClientX: e.clientX,
      startClientY: e.clientY,
    });
  }

  onPointerMove(e: PointerEvent) {
    this.#lastPointerClientX = e.clientX;
    this.#lastPointerClientY = e.clientY;
    this.#edgeScroll.updatePointer(e.clientX, e.clientY);
    this.#dispatch({ type: "pointer-move", clientX: e.clientX, clientY: e.clientY });
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

  #dispatch(input: DragInput) {
    const ctx = this.#buildContext();
    if (!ctx) return;

    const result = transition(this.#state, input, ctx);
    this.#state = result.state;
    this.#interpretEffects(result.effects);
  }

  #buildContext(): TransitionContext | null {
    const containerRect = this.#projection.getContainerRect();
    const verticalRect = this.#verticalContainer?.getBoundingClientRect();
    if (!containerRect || !verticalRect || !this.#data) return null;

    return {
      containerRect,
      verticalRect,
      verticalScrollTop: this.#verticalContainer?.scrollTop ?? 0,
      scale: this.#projection.scale,
      screenToContentX: (x) => this.#projection.screenToContentX(x),
      timeSignature: this.#data.timeSignature,
      trackLayouts: this.#data.trackLayouts,
      trackOrder: this.#data.trackOrder,
      trackById: this.#data.trackById,
    };
  }

  // ---- Effect interpreter ----

  #interpretEffects(effects: DragEffect[]) {
    for (const effect of effects) {
      switch (effect.type) {
        case "set-cursor":
          this.#cursor.set(effect.cursor);
          break;

        case "clear-cursor":
          this.#cursor.clear();
          break;

        case "start-edge-scroll":
          this.#edgeScroll.start((dx, dy) => {
            this.#handleEdgeScrollTick(dx, dy);
          });
          break;

        case "stop-edge-scroll":
          this.#edgeScroll.stop();
          break;

        case "pan-timeline": {
          const nextTimeline = Timeline.panBy(
            this.#projection.timeline,
            effect.delta,
          );
          this.#setTimeline(nextTimeline);
          break;
        }

        case "scroll-vertical":
          if (this.#verticalContainer) {
            this.#verticalContainer.scrollTop += effect.dy;
          }
          break;

        case "commit":
          this.#data?.onCommit(effect.clipId, effect.start, effect.trackId);
          break;

        case "request-update":
          this.#onUpdate();
          break;
      }
    }
  }

  // ---- Edge scroll tick handler ----

  #handleEdgeScrollTick(dx: number, dy: number) {
    if (this.#state.phase !== "dragging") return;

    const ctx = this.#buildContext();
    if (!ctx) return;

    // Process the edge scroll tick through the state machine
    const result = transition(this.#state, { type: "edge-scroll-tick", dx, dy }, ctx);
    this.#state = result.state;
    this.#interpretEffects(result.effects);

    // After pan/scroll effects have been applied, recompute the ghost
    // with updated context (the pan changed the projection origin).
    if (this.#state.phase === "dragging") {
      const freshCtx = this.#buildContext();
      if (freshCtx) {
        const moveResult = transition(
          this.#state,
          {
            type: "pointer-move",
            clientX: this.#lastPointerClientX,
            clientY: this.#lastPointerClientY,
          },
          freshCtx,
        );
        this.#state = moveResult.state;
        this.#interpretEffects(moveResult.effects);
      }
    }
  }
}
