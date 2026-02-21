// clip-drag.ts — Clip drag state machine.
//
// Manages the pending → dragging → idle lifecycle for clip drag operations.
// Keeps state as plain mutable variables (no UIState pollution).
// The controller is instantiated once in ProjectionTrackList's setup closure.

import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as Timeline from "@daw/core/lib/timeline";
import { computeGridInterval } from "@daw/core/lib/ruler";
import type { TimeSignature } from "@daw/core/lib/time-signature";
import type { ProjectionContext } from "./projection-context";
import type { TrackLayout } from "./track-layout";
import type { TrackColor } from "../renderers/timeline/types";
import type { TimelineRootContext } from "../components/timeline-root";
import { computeEdgeDeltas, isOutOfBounds } from "./edge-scroll";

const DEAD_ZONE_PX = 3;

// ---------------------------------------------------------------------------
// Snap
// ---------------------------------------------------------------------------

export function snapToGrid(positionQN: QN.QN, scale: number, timeSignature: TimeSignature): QN.QN {
  const { interval } = computeGridInterval({ scale, timeSignature });
  const raw = positionQN as number;
  const step = interval as number;
  const snapped = Math.round(raw / step) * step;
  return QN.max(QN.zero, QN.QN(snapped));
}

// ---------------------------------------------------------------------------
// Track hit-testing
// ---------------------------------------------------------------------------

export function hitTestTrack(
  pointerY: number,
  trackLayouts: Map<string, TrackLayout>,
  trackOrder: readonly string[],
): string | null {
  for (const trackId of trackOrder) {
    const layout = trackLayouts.get(trackId);
    if (!layout) continue;
    const top = layout.y as number;
    const bottom = top + (layout.height as number);
    if (pointerY >= top && pointerY < bottom) {
      return trackId;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Compatibility check
// ---------------------------------------------------------------------------

export function isCompatibleDrop(
  clipPayloadKind: "midi" | "audio",
  targetTrackType: "midi" | "audio" | "bus",
): boolean {
  if (clipPayloadKind === "midi" && targetTrackType === "midi") return true;
  if (clipPayloadKind === "audio" && targetTrackType === "audio") return true;
  return false;
}

// ---------------------------------------------------------------------------
// Ghost state (read by renderer)
// ---------------------------------------------------------------------------

export type GhostState = {
  clipId: string;
  startQN: QN.QN;
  trackId: string;
  width: Px.Px;
  height: Px.Px;
  color: TrackColor;
  isValid: boolean;
};

// ---------------------------------------------------------------------------
// Drag controller
// ---------------------------------------------------------------------------

type Idle = { phase: "idle" };
type Pending = {
  phase: "pending";
  clipId: string;
  originTrackId: string;
  originStartQN: QN.QN;
  clipSizeQN: QN.QN;
  payloadKind: "midi" | "audio";
  color: TrackColor;
  clipWidth: Px.Px;
  clipHeight: Px.Px;
  grabOffsetQN: QN.QN;
  grabOffsetY: number;
  startClientX: number;
  startClientY: number;
};
type Dragging = {
  phase: "dragging";
  clipId: string;
  originTrackId: string;
  originStartQN: QN.QN;
  clipSizeQN: QN.QN;
  payloadKind: "midi" | "audio";
  color: TrackColor;
  clipWidth: Px.Px;
  clipHeight: Px.Px;
  grabOffsetQN: QN.QN;
  grabOffsetY: number;
  ghostStartQN: QN.QN;
  ghostTrackId: string;
  isValid: boolean;
  isOOB: boolean;
};

type DragState = Idle | Pending | Dragging;

export type CommitCallback = (clipId: string, newStart: QN.QN, newTrackId: string) => void;
export type UpdateCallback = () => void;

export class ClipDragController {
  state: DragState = { phase: "idle" };

  // External dependencies (set once during setup)
  projection!: ProjectionContext;
  rootCtx!: TimelineRootContext;
  timeSignature!: TimeSignature;
  onCommit!: CommitCallback;
  onUpdate!: UpdateCallback;

  // Mutable refs to latest data (updated each render)
  trackLayouts: Map<string, TrackLayout> = new Map();
  trackOrder: readonly string[] = [];
  trackById: Map<string, { type: "midi" | "audio" | "bus"; color: TrackColor }> = new Map();

  // Edge scroll
  #edgeScrollRaf = 0;
  #lastPointerClientX = 0;
  #lastPointerClientY = 0;
  #verticalContainer: HTMLElement | null = null;

  // Global cursor override
  #cursorStyle: HTMLStyleElement | null = null;

  get ghost(): GhostState | null {
    if (this.state.phase !== "dragging") return null;
    const s = this.state;

    const startQN = s.isOOB ? s.originStartQN : s.ghostStartQN;
    const trackId = s.isOOB ? s.originTrackId : s.ghostTrackId;

    // No ghost when the clip hasn't moved from its original position
    if (QN.eq(startQN, s.originStartQN) && trackId === s.originTrackId) return null;

    const targetTrack = this.trackById.get(trackId);
    return {
      clipId: s.clipId,
      startQN,
      trackId,
      width: s.clipWidth,
      height: s.clipHeight,
      color: targetTrack?.color ?? s.color,
      isValid: s.isOOB ? false : s.isValid,
    };
  }

  get isDragging(): boolean {
    return this.state.phase !== "idle";
  }

  get dragSourceClipId(): string | null {
    return this.state.phase !== "idle" ? this.state.clipId : null;
  }

  setVerticalContainer(el: HTMLElement | null) {
    this.#verticalContainer = el;
  }

  // ------- Start pending -------
  startPending(
    clipId: string,
    e: PointerEvent,
    clip: {
      originTrackId: string;
      origin: Span.Span<QN.QN>;
      payloadKind: "midi" | "audio";
      color: TrackColor;
      clipWidth: Px.Px;
      clipHeight: Px.Px;
    },
  ) {
    const containerRect = this.projection.getContainerRect();
    if (!containerRect) return;

    // Compute grab offset: where within the clip the pointer landed (in QN)
    // Use viewport-relative position only — the projection origin already accounts for scroll.
    const pointerScreenX = Px.Px(e.clientX - containerRect.left);
    const pointerQN = this.projection.screenToContentX(pointerScreenX);
    const grabOffsetQN = QN.subtract(pointerQN, clip.origin.start);

    // Vertical grab offset: distance from pointer to clip's track layout top
    const trackLayout = this.trackLayouts.get(clip.originTrackId);
    const vertScrollTop = this.#verticalContainer?.scrollTop ?? 0;
    const trackListRect = this.#verticalContainer?.getBoundingClientRect();
    const pointerTrackY = trackListRect ? e.clientY - trackListRect.top + vertScrollTop : 0;
    const grabOffsetY = trackLayout ? pointerTrackY - (trackLayout.y as number) : 0;

    this.state = {
      phase: "pending",
      clipId,
      originTrackId: clip.originTrackId,
      originStartQN: clip.origin.start,
      clipSizeQN: clip.origin.size,
      payloadKind: clip.payloadKind,
      color: clip.color,
      clipWidth: clip.clipWidth,
      clipHeight: clip.clipHeight,
      grabOffsetQN,
      grabOffsetY,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
  }

  // ------- Pointer move -------
  onPointerMove(e: PointerEvent) {
    this.#lastPointerClientX = e.clientX;
    this.#lastPointerClientY = e.clientY;

    if (this.state.phase === "pending") {
      const dx = e.clientX - this.state.startClientX;
      const dy = e.clientY - this.state.startClientY;
      if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE_PX) return;
      this.#transitionToDragging();
      this.#forceCursor("grabbing");
    }

    if (this.state.phase === "dragging") {
      this.#updateGhost(e.clientX, e.clientY);
      this.onUpdate();
    }
  }

  // ------- Pointer up -------
  onPointerUp(_e: PointerEvent) {
    if (this.state.phase === "dragging") {
      const s = this.state;
      if (s.isValid && !s.isOOB) {
        this.onCommit(s.clipId, s.ghostStartQN, s.ghostTrackId);
      }
    }
    this.#cancel();
  }

  // ------- Escape -------
  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && this.state.phase !== "idle") {
      this.#cancel();
    }
  }

  // ------- Private -------
  #transitionToDragging() {
    if (this.state.phase !== "pending") return;
    const s = this.state;
    this.state = {
      phase: "dragging",
      clipId: s.clipId,
      originTrackId: s.originTrackId,
      originStartQN: s.originStartQN,
      clipSizeQN: s.clipSizeQN,
      payloadKind: s.payloadKind,
      color: s.color,
      clipWidth: s.clipWidth,
      clipHeight: s.clipHeight,
      grabOffsetQN: s.grabOffsetQN,
      grabOffsetY: s.grabOffsetY,
      ghostStartQN: s.originStartQN,
      ghostTrackId: s.originTrackId,
      isValid: true,
      isOOB: false,
    };
    this.#startEdgeScroll();
  }

  #updateGhost(clientX: number, clientY: number) {
    if (this.state.phase !== "dragging") return;
    const s = this.state;

    const containerRect = this.projection.getContainerRect();
    const verticalRect = this.#verticalContainer?.getBoundingClientRect();
    if (!containerRect || !verticalRect) return;

    // Check out-of-bounds (pointer left the timeline viewport entirely)
    const oob = isOutOfBounds(clientX, clientY, verticalRect);
    if (oob) {
      this.state = { ...s, isOOB: true };
      this.#forceCursor("not-allowed");
      return;
    }

    // Compute snapped QN position (viewport-relative — origin accounts for scroll)
    const pointerScreenX = Px.Px(clientX - containerRect.left);
    const pointerQN = this.projection.screenToContentX(pointerScreenX);
    const rawStartQN = QN.subtract(pointerQN, s.grabOffsetQN);
    const snappedStartQN = snapToGrid(rawStartQN, this.projection.scale, this.timeSignature);

    // Hit-test track
    const vertScrollTop = this.#verticalContainer?.scrollTop ?? 0;
    const pointerTrackY = clientY - verticalRect.top + vertScrollTop;
    const targetTrackId = hitTestTrack(pointerTrackY, this.trackLayouts, this.trackOrder);
    const ghostTrackId = targetTrackId ?? s.ghostTrackId;

    // Check compatibility
    const targetTrack = this.trackById.get(ghostTrackId);
    const isValid = targetTrack ? isCompatibleDrop(s.payloadKind, targetTrack.type) : false;

    this.state = {
      ...s,
      ghostStartQN: snappedStartQN,
      ghostTrackId,
      isValid,
      isOOB: false,
    };

    this.#forceCursor(isValid ? "grabbing" : "not-allowed");
  }

  // ------- Edge scroll -------
  #startEdgeScroll() {
    const tick = () => {
      if (this.state.phase !== "dragging") return;

      const containerRect = this.projection.getContainerRect();
      const verticalRect = this.#verticalContainer?.getBoundingClientRect();
      if (!containerRect || !verticalRect) {
        this.#edgeScrollRaf = requestAnimationFrame(tick);
        return;
      }

      const { dx, dy } = computeEdgeDeltas(
        this.#lastPointerClientX,
        this.#lastPointerClientY,
        containerRect,
        verticalRect,
      );

      let needsUpdate = false;

      if (Math.abs(dx) > 0.01) {
        // Convert px delta to QN and pan the timeline
        const deltaQN = QN.QN(dx / this.projection.scale);
        const nextTimeline = Timeline.panBy(QN.Numeric, this.rootCtx.timeline, deltaQN);
        this.rootCtx.setTimeline(nextTimeline);
        // Sync projection immediately so #updateGhost uses the new origin
        this.projection.setTimeline(nextTimeline);
        needsUpdate = true;
      }

      if (Math.abs(dy) > 0.01 && this.#verticalContainer) {
        this.#verticalContainer.scrollTop += dy;
        needsUpdate = true;
      }

      // Recompute ghost after scroll shift
      if (needsUpdate) {
        this.#updateGhost(this.#lastPointerClientX, this.#lastPointerClientY);
        this.onUpdate();
      }

      this.#edgeScrollRaf = requestAnimationFrame(tick);
    };

    this.#edgeScrollRaf = requestAnimationFrame(tick);
  }

  #stopEdgeScroll() {
    cancelAnimationFrame(this.#edgeScrollRaf);
    this.#edgeScrollRaf = 0;
  }

  #forceCursor(cursor: string) {
    if (!this.#cursorStyle) {
      this.#cursorStyle = document.createElement("style");
      document.head.appendChild(this.#cursorStyle);
    }
    this.#cursorStyle.textContent = `* { cursor: ${cursor} !important; }`;
  }

  #clearCursor() {
    this.#cursorStyle?.remove();
    this.#cursorStyle = null;
  }

  #cancel() {
    this.#stopEdgeScroll();
    this.state = { phase: "idle" };
    this.#clearCursor();
    this.onUpdate();
  }
}
