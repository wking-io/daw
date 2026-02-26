import { describe, expect, it } from "bun:test";
import { Option, Schema } from "effect";
import * as N from "@daw/core/lib/numeric";
import * as QN from "@daw/core/lib/qn";
import * as Px from "@daw/core/lib/px";
import * as Span from "@daw/core/lib/span";
import * as TimeSignature from "@daw/core/lib/time-signature";
import {
  type ResizeState,
  type ResizeTransitionContext,
  type ResizeEffect,
  ResizeEdge,
  idle,
  transition,
  deriveResizeGhost,
} from "./clip-resize";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TS_4_4 = TimeSignature.make(4, 4);

function makeCtx(overrides: Partial<ResizeTransitionContext> = {}): ResizeTransitionContext {
  const scale = overrides.scale ?? 10; // 10px per QN
  return {
    containerRect: { left: 0, right: 1000, top: 0, bottom: 500 } as DOMRect,
    scale,
    screenToContentX: (x: Px.Px) => QN.QN((x as number) / scale),
    timeSignature: TS_4_4,
    ...overrides,
  };
}

const originSpan = Span.make(QN.QN(4), QN.QN(4)); // QN 4..8

function startPending(edge: "left" | "right", state: ResizeState = idle): ResizeState {
  const ctx = makeCtx();
  const result = transition(
    state,
    {
      type: "start-pending",
      clipId: "clip-1",
      edge,
      originSpan,
      color: "cobalt",
      startClientX: Px.Px(60), // QN 6 at scale 10
    },
    ctx,
  );
  return result.state;
}

function findEffect(effects: ResizeEffect[], type: string) {
  return effects.find((e) => e.type === type);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const decodeResizeEdge = Schema.decodeUnknownSync(ResizeEdge);

describe("ResizeEdge schema", () => {
  it('parses "left"', () => {
    expect(decodeResizeEdge("left")).toBe("left");
  });

  it('parses "right"', () => {
    expect(decodeResizeEdge("right")).toBe("right");
  });

  it("rejects invalid strings", () => {
    expect(() => decodeResizeEdge("top")).toThrow();
    expect(() => decodeResizeEdge("")).toThrow();
  });

  it("rejects non-string values", () => {
    expect(() => decodeResizeEdge(42)).toThrow();
    expect(() => decodeResizeEdge(null)).toThrow();
    expect(() => decodeResizeEdge(undefined)).toThrow();
  });
});

describe("clip-resize state machine", () => {
  describe("start-pending", () => {
    it("transitions from idle to pending", () => {
      const state = startPending("right");
      expect(state.phase).toBe("pending");
      if (state.phase === "pending") {
        expect(state.clipId).toBe("clip-1");
        expect(state.edge).toBe("right");
        expect(state.originSpan).toEqual(originSpan);
      }
    });
  });

  describe("dead zone", () => {
    it("stays pending when pointer moves less than 3px", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(61) }, ctx);
      expect(result.state.phase).toBe("pending");
      expect(result.effects).toEqual([]);
    });

    it("transitions to resizing after exceeding dead zone", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(70) }, ctx);
      expect(result.state.phase).toBe("resizing");
      expect(findEffect(result.effects, "set-cursor")).toBeDefined();
      expect(findEffect(result.effects, "start-edge-scroll")).toBeDefined();
    });
  });

  describe("right edge resize", () => {
    it("computes ghost span keeping start fixed", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      // Move to clientX=100 => screenX=100 => QN=10
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(100) }, ctx);
      expect(result.state.phase).toBe("resizing");
      if (result.state.phase === "resizing") {
        // originSpan.start=4, snapped end=10 => size=6
        expect(result.state.ghostSpan.start).toBe(originSpan.start);
        expect(N.gte(Span.end(result.state.ghostSpan), originSpan.start)).toBe(true);
      }
    });

    it("enforces minimum size", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      // Move to clientX=41 => screenX=41 => QN=4.1, snaps to 4
      // But minimum size is 1 grid interval, so end = start + minSize
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(41) }, ctx);
      expect(result.state.phase).toBe("resizing");
      if (result.state.phase === "resizing") {
        expect(result.state.ghostSpan.start).toBe(originSpan.start);
        expect(N.gt(result.state.ghostSpan.size, QN.zero)).toBe(true);
      }
    });
  });

  describe("left edge resize", () => {
    it("computes ghost span keeping end fixed", () => {
      const pending = startPending("left");
      const ctx = makeCtx();
      // Move to clientX=20 => screenX=20 => QN=2
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(20) }, ctx);
      expect(result.state.phase).toBe("resizing");
      if (result.state.phase === "resizing") {
        const ghostEnd = Span.end(result.state.ghostSpan);
        const originEnd = Span.end(originSpan);
        // End should be preserved
        expect(ghostEnd).toBe(originEnd);
        // Start should be at QN 2
        expect(result.state.ghostSpan.start).toBe(QN.QN(2));
      }
    });

    it("enforces minimum size", () => {
      const pending = startPending("left");
      const ctx = makeCtx();
      // Move far right past the end => should clamp to keep minimum size
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(200) }, ctx);
      expect(result.state.phase).toBe("resizing");
      if (result.state.phase === "resizing") {
        expect(N.gt(result.state.ghostSpan.size, QN.zero)).toBe(true);
        const ghostEnd = Span.end(result.state.ghostSpan);
        expect(ghostEnd).toBe(Span.end(originSpan));
      }
    });

    it("clamps start to zero", () => {
      const pending = startPending("left");
      const ctx = makeCtx();
      // Move to clientX=-100 => screenX=-100 => QN=-10, clamped to 0
      const result = transition(pending, { type: "pointer-move", clientX: Px.Px(-100) }, ctx);
      expect(result.state.phase).toBe("resizing");
      if (result.state.phase === "resizing") {
        expect(N.gte(result.state.ghostSpan.start, QN.zero)).toBe(true);
      }
    });
  });

  describe("escape", () => {
    it("cancels from pending", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const result = transition(pending, { type: "escape" }, ctx);
      expect(result.state.phase).toBe("idle");
      expect(findEffect(result.effects, "clear-cursor")).toBeDefined();
    });

    it("cancels from resizing", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const resizing = transition(pending, { type: "pointer-move", clientX: Px.Px(100) }, ctx);
      const result = transition(resizing.state, { type: "escape" }, ctx);
      expect(result.state.phase).toBe("idle");
      expect(findEffect(result.effects, "stop-edge-scroll")).toBeDefined();
      expect(findEffect(result.effects, "clear-cursor")).toBeDefined();
    });

    it("does nothing from idle", () => {
      const ctx = makeCtx();
      const result = transition(idle, { type: "escape" }, ctx);
      expect(result.state.phase).toBe("idle");
      expect(result.effects).toEqual([]);
    });
  });

  describe("pointer-up", () => {
    it("commits when span changed", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const resizing = transition(pending, { type: "pointer-move", clientX: Px.Px(100) }, ctx);
      const result = transition(resizing.state, { type: "pointer-up" }, ctx);
      expect(result.state.phase).toBe("idle");
      const commit = findEffect(result.effects, "commit") as
        | Extract<ResizeEffect, { type: "commit" }>
        | undefined;
      expect(commit).toBeDefined();
      expect(commit!.clipId).toBe("clip-1");
    });

    it("cancels from pending (no commit)", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const result = transition(pending, { type: "pointer-up" }, ctx);
      expect(result.state.phase).toBe("idle");
      expect(findEffect(result.effects, "commit")).toBeUndefined();
    });
  });

  describe("deriveResizeGhost", () => {
    it("returns none for idle", () => {
      expect(Option.isNone(deriveResizeGhost(idle))).toBe(true);
    });

    it("returns none for pending", () => {
      const pending = startPending("right");
      expect(Option.isNone(deriveResizeGhost(pending))).toBe(true);
    });

    it("returns none when span unchanged", () => {
      // Manually create a resizing state where ghostSpan equals originSpan
      const state: ResizeState = {
        phase: "resizing",
        clipId: "clip-1",
        edge: "right",
        originSpan,
        color: "cobalt",
        ghostSpan: { ...originSpan },
      };
      expect(Option.isNone(deriveResizeGhost(state))).toBe(true);
    });

    it("returns ghost when span changed", () => {
      const pending = startPending("right");
      const ctx = makeCtx();
      const resizing = transition(pending, { type: "pointer-move", clientX: Px.Px(100) }, ctx);
      const ghost = deriveResizeGhost(resizing.state);
      expect(Option.isSome(ghost)).toBe(true);
      if (Option.isSome(ghost)) {
        expect(ghost.value.clipId).toBe("clip-1");
        expect(ghost.value.edge).toBe("right");
        expect(ghost.value.originSpan).toEqual(originSpan);
      }
    });
  });
});
