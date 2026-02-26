// interaction-drivers.ts — Shared effectful primitives for drag/resize interactions.
//
// CursorOverride: injects a global <style> tag to force cursor during gestures.
// EdgeScrollDriver: runs a rAF loop that computes scroll deltas when the
// pointer is near container edges.

import * as Px from "@daw/core/lib/px";
import { computeEdgeDeltas } from "./edge-scroll";

// ---------------------------------------------------------------------------
// Cursor override
// ---------------------------------------------------------------------------

export class CursorOverride {
  #style: HTMLStyleElement | null = null;

  set(cursor: string) {
    if (!this.#style) {
      this.#style = document.createElement("style");
      document.head.appendChild(this.#style);
    }
    this.#style.textContent = `* { cursor: ${cursor} !important; }`;
  }

  clear() {
    this.#style?.remove();
    this.#style = null;
  }
}

// ---------------------------------------------------------------------------
// Edge scroll driver
// ---------------------------------------------------------------------------

export class EdgeScrollDriver {
  #raf = 0;
  #onTick: ((dx: Px.Px, dy: Px.Px) => void) | null = null;

  #lastPointerClientX = Px.zero;
  #lastPointerClientY = Px.zero;
  #getHorizontalRect: () => DOMRect | null;
  #getVerticalRect: () => DOMRect | null;

  constructor(getHorizontalRect: () => DOMRect | null, getVerticalRect: () => DOMRect | null) {
    this.#getHorizontalRect = getHorizontalRect;
    this.#getVerticalRect = getVerticalRect;
  }

  updatePointer(clientX: number, clientY: number) {
    this.#lastPointerClientX = Px.Px(clientX);
    this.#lastPointerClientY = Px.Px(clientY);
  }

  start(onTick: (dx: Px.Px, dy: Px.Px) => void) {
    this.#onTick = onTick;
    const tick = () => {
      const hRect = this.#getHorizontalRect();
      const vRect = this.#getVerticalRect();
      if (hRect && vRect) {
        const { dx, dy } = computeEdgeDeltas(
          this.#lastPointerClientX,
          this.#lastPointerClientY,
          hRect,
          vRect,
        );
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          this.#onTick?.(dx, dy);
        }
      }
      this.#raf = requestAnimationFrame(tick);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#onTick = null;
  }
}
