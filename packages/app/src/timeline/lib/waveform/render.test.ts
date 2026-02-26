import { describe, expect, it } from "bun:test";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import * as Px from "@daw/core/lib/px";
import * as Span from "@daw/core/lib/span";
import { drawWaveform } from "./render";
import type { PeakBin } from "./bin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Rect = { x: number; y: number; w: number; h: number };

function mockCtx(): CanvasRenderingContext2D & { rects: Rect[] } {
  const rects: Rect[] = [];
  return {
    rects,
    fillStyle: "",
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ x, y, w, h });
    },
  } as unknown as CanvasRenderingContext2D & { rects: Rect[] };
}

/** Construct a ClipProjection directly for renderer-level tests. */
function proj(width: number, viewStart: number, viewSize: number): ClipProjection {
  return {
    scale: width,
    view: Span.make(Px.Px(viewStart), Px.Px(viewSize)),
    width: Px.Px(width),
  };
}

/** Create a single bin with uniform symmetric peak values (Int8 scale). */
function uniformBin(length: number, value: number): PeakBin {
  const bin = new Int8Array(length * 2);
  for (let i = 0; i < length; i++) {
    bin[i * 2] = -value; // min
    bin[i * 2 + 1] = value; // max
  }
  return bin;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("drawWaveform", () => {
  it("does nothing for empty bins", () => {
    const ctx = mockCtx();
    drawWaveform(ctx, [], 100, "blue", proj(200, 0, 200));
    expect(ctx.rects).toHaveLength(0);
  });

  it("does nothing when bins contain zero peaks", () => {
    const ctx = mockCtx();
    drawWaveform(ctx, [new Int8Array(0)], 100, "blue", proj(200, 0, 200));
    expect(ctx.rects).toHaveLength(0);
  });

  it("sets fillStyle to the provided color", () => {
    const ctx = mockCtx();
    drawWaveform(ctx, [uniformBin(10, 64)], 100, "#00ff00", proj(200, 0, 200));
    expect(ctx.fillStyle).toBe("#00ff00");
  });

  // --- Upsample path (totalPeaks <= projection.width) ---

  describe("upsample path (fewer peaks than pixels)", () => {
    it("renders one rect per peak", () => {
      const ctx = mockCtx();
      drawWaveform(ctx, [uniformBin(5, 64)], 100, "blue", proj(200, 0, 200));
      expect(ctx.rects).toHaveLength(5);
    });

    it("spaces peaks evenly across the clip width", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25px/peak
      drawWaveform(ctx, [uniformBin(4, 64)], 100, "blue", proj(100, 0, 100));
      const xs = ctx.rects.map((r) => r.x);
      expect(xs).toEqual([0, 25, 50, 75]);
    });

    it("culls peaks entirely to the left of the visible window", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25
      // Peak 0: clipX=0, end=25. Peak 1: clipX=25, end=50.
      // view.start=60 → both culled (end < 60)
      drawWaveform(ctx, [uniformBin(4, 64)], 100, "blue", proj(100, 60, 40));
      expect(ctx.rects).toHaveLength(2);
    });

    it("culls peaks entirely to the right of the visible window", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25
      // view [0, 40). Peak 2 at clipX=50 > 40 → culled.
      drawWaveform(ctx, [uniformBin(4, 64)], 100, "blue", proj(100, 0, 40));
      expect(ctx.rects).toHaveLength(2);
    });

    it("positions rects relative to view.start", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25. view.start = 50
      drawWaveform(ctx, [uniformBin(4, 64)], 100, "blue", proj(100, 50, 50));
      expect(ctx.rects).toHaveLength(3);
      expect(ctx.rects[0]!.x).toBe(-25); // partially visible
      expect(ctx.rects[1]!.x).toBe(0);
      expect(ctx.rects[2]!.x).toBe(25);
    });

    it("scales magnitude to canvas height", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      // Peak value 127 → max occupies full half, min occupies full half
      drawWaveform(ctx, [uniformBin(1, 127)], canvasH, "blue", proj(100, 0, 100));
      const r = ctx.rects[0]!;
      expect(r.y).toBeCloseTo(0);
      expect(r.h).toBeCloseTo(100);
    });

    it("silent peaks produce zero-height rects", () => {
      const ctx = mockCtx();
      drawWaveform(ctx, [uniformBin(1, 0)], 100, "blue", proj(100, 0, 100));
      const r = ctx.rects[0]!;
      expect(r.h).toBe(0);
    });
  });

  // --- Downsample path (totalPeaks > projection.width) ---

  describe("downsample path (more peaks than pixels)", () => {
    it("renders at most one rect per visible pixel column", () => {
      const ctx = mockCtx();
      // 400 peaks, 100px width → downsample. Full view [0,100).
      drawWaveform(ctx, [uniformBin(400, 64)], 100, "blue", proj(100, 0, 100));
      expect(ctx.rects).toHaveLength(100);
    });

    it("only iterates visible pixel columns", () => {
      const ctx = mockCtx();
      // 400 peaks, 100px width. view [20, 50) → 30 columns
      drawWaveform(ctx, [uniformBin(400, 64)], 100, "blue", proj(100, 20, 30));
      expect(ctx.rects).toHaveLength(30);
    });

    it("positions rects relative to view.start", () => {
      const ctx = mockCtx();
      drawWaveform(ctx, [uniformBin(400, 64)], 100, "blue", proj(100, 20, 30));
      expect(ctx.rects[0]!.x).toBe(0);
      expect(ctx.rects[ctx.rects.length - 1]!.x).toBe(29);
    });

    it("takes min/max peak values per pixel column", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      const centerY = canvasH / 2;
      // 4 peaks in 2px → 2 peaks per pixel
      // Peaks: (-10, 50), (-30, 20), (-5, 60), (-40, 10)
      const bin = new Int8Array([-10, 50, -30, 20, -5, 60, -40, 10]);
      drawWaveform(ctx, [bin], canvasH, "blue", proj(2, 0, 2));
      // Column 0: peaks 0,1 → min=min(-10,-30)=-30, max=max(50,20)=50
      const yTop0 = centerY - (50 / 127) * centerY;
      const yBot0 = centerY - (-30 / 127) * centerY;
      expect(ctx.rects[0]!.y).toBeCloseTo(yTop0);
      expect(ctx.rects[0]!.h).toBeCloseTo(yBot0 - yTop0);
      // Column 1: peaks 2,3 → min=min(-5,-40)=-40, max=max(60,10)=60
      const yTop1 = centerY - (60 / 127) * centerY;
      const yBot1 = centerY - (-40 / 127) * centerY;
      expect(ctx.rects[1]!.y).toBeCloseTo(yTop1);
      expect(ctx.rects[1]!.h).toBeCloseTo(yBot1 - yTop1);
    });
  });

  // --- Cross-cutting ---

  it("works across multiple bins", () => {
    const ctx = mockCtx();
    // Two bins of 3 peaks each = 6 peaks total, 200px width → upsample
    drawWaveform(ctx, [uniformBin(3, 64), uniformBin(3, 64)], 100, "blue", proj(200, 0, 200));
    expect(ctx.rects).toHaveLength(6);
  });

  it("law: upsample rect x equals peakIdx * scale - view.start", () => {
    const ctx = mockCtx();
    const width = 100;
    const nPeaks = 4;
    // scale = width / nPeaks = 25px/peak
    const viewStart = 30;
    drawWaveform(ctx, [uniformBin(nPeaks, 64)], 100, "blue", proj(width, viewStart, 70));
    expect(ctx.rects).toHaveLength(3);
    expect(ctx.rects[0]!.x).toBeCloseTo(-5);
    expect(ctx.rects[1]!.x).toBeCloseTo(20);
    expect(ctx.rects[2]!.x).toBeCloseTo(45);
  });

  // --- Asymmetric waveform tests ---

  describe("asymmetric waveforms", () => {
    it("renders asymmetric envelope (min != -max)", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      const centerY = 50;
      // Single peak: min=-100, max=50
      const bin = new Int8Array([-100, 50]);
      drawWaveform(ctx, [bin], canvasH, "blue", proj(100, 0, 100));

      const r = ctx.rects[0]!;
      const yTop = centerY - (50 / 127) * centerY;
      const yBot = centerY - (-100 / 127) * centerY;
      expect(r.y).toBeCloseTo(yTop);
      expect(r.h).toBeCloseTo(yBot - yTop);
    });

    it("handles positive-only signal (min=0, max>0)", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      const centerY = 50;
      const bin = new Int8Array([0, 80]);
      drawWaveform(ctx, [bin], canvasH, "blue", proj(100, 0, 100));

      const r = ctx.rects[0]!;
      const yTop = centerY - (80 / 127) * centerY;
      expect(r.y).toBeCloseTo(yTop);
      expect(r.h).toBeCloseTo(centerY - yTop); // extends from yTop down to centerY
    });

    it("handles negative-only signal (min<0, max=0)", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      const centerY = 50;
      const bin = new Int8Array([-80, 0]);
      drawWaveform(ctx, [bin], canvasH, "blue", proj(100, 0, 100));

      const r = ctx.rects[0]!;
      const yBot = centerY - (-80 / 127) * centerY;
      expect(r.y).toBeCloseTo(centerY);
      expect(r.h).toBeCloseTo(yBot - centerY);
    });
  });
});
