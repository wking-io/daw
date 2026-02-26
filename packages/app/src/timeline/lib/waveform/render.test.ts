import { describe, expect, it } from "bun:test";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import * as Px from "@daw/core/lib/px";
import * as Span from "@daw/core/lib/span";
import { drawWaveform } from "./render";

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
    scale: width, // not used by drawWaveform (it computes its own scale from totalPeaks/width)
    view: Span.make(Px.Px(viewStart), Px.Px(viewSize)),
    width: Px.Px(width),
  };
}

/** Create a single bin with uniform peak values. */
function uniformBin(length: number, value: number): Uint8Array {
  const bin = new Uint8Array(length);
  bin.fill(value);
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
    drawWaveform(ctx, [new Uint8Array(0)], 100, "blue", proj(200, 0, 200));
    expect(ctx.rects).toHaveLength(0);
  });

  it("sets fillStyle to the provided color", () => {
    const ctx = mockCtx();
    drawWaveform(ctx, [uniformBin(10, 128)], 100, "#00ff00", proj(200, 0, 200));
    expect(ctx.fillStyle).toBe("#00ff00");
  });

  // --- Upsample path (totalPeaks <= projection.width) ---

  describe("upsample path (fewer peaks than pixels)", () => {
    it("renders one rect per peak", () => {
      const ctx = mockCtx();
      // 5 peaks, 200px width → upsample
      drawWaveform(ctx, [uniformBin(5, 128)], 100, "blue", proj(200, 0, 200));
      expect(ctx.rects).toHaveLength(5);
    });

    it("spaces peaks evenly across the clip width", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25px/peak
      drawWaveform(ctx, [uniformBin(4, 128)], 100, "blue", proj(100, 0, 100));
      const xs = ctx.rects.map((r) => r.x);
      expect(xs).toEqual([0, 25, 50, 75]);
    });

    it("culls peaks entirely to the left of the visible window", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25
      // Peak 0: clipX=0, end=25.  Peak 1: clipX=25, end=50.
      // view.start=60 → both culled (end < 60)
      // Peak 2: clipX=50, end=75 → kept (75 >= 60)
      // Peak 3: clipX=75, end=100 → kept
      drawWaveform(ctx, [uniformBin(4, 128)], 100, "blue", proj(100, 60, 40));
      expect(ctx.rects).toHaveLength(2);
    });

    it("culls peaks entirely to the right of the visible window", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25
      // view [0, 40). Peak 2 at clipX=50 > 40 → culled. Peak 3 same.
      drawWaveform(ctx, [uniformBin(4, 128)], 100, "blue", proj(100, 0, 40));
      expect(ctx.rects).toHaveLength(2);
    });

    it("positions rects relative to view.start", () => {
      const ctx = mockCtx();
      // 4 peaks, 100px width → scale = 25. view.start = 50
      // Peak 0: clipX=0, end=25 < 50 → culled
      // Peak 1: clipX=25, end=50, NOT culled (50 < 50 is false), x=25-50=-25
      // Peak 2: clipX=50, x=50-50=0
      // Peak 3: clipX=75, x=75-50=25
      drawWaveform(ctx, [uniformBin(4, 128)], 100, "blue", proj(100, 50, 50));
      expect(ctx.rects).toHaveLength(3);
      expect(ctx.rects[0]!.x).toBe(-25); // partially visible
      expect(ctx.rects[1]!.x).toBe(0);
      expect(ctx.rects[2]!.x).toBe(25);
    });

    it("scales magnitude to canvas height", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      const centerY = canvasH / 2;
      // Peak value 255 → magnitude = (255/255) * 50 = 50
      drawWaveform(ctx, [uniformBin(1, 255)], canvasH, "blue", proj(100, 0, 100));
      const r = ctx.rects[0]!;
      expect(r.y).toBe(centerY - 50); // = 0
      expect(r.h).toBe(100); // 50 * 2
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
      drawWaveform(ctx, [uniformBin(400, 128)], 100, "blue", proj(100, 0, 100));
      expect(ctx.rects).toHaveLength(100);
    });

    it("only iterates visible pixel columns", () => {
      const ctx = mockCtx();
      // 400 peaks, 100px width. view [20, 50) → 30 columns
      drawWaveform(ctx, [uniformBin(400, 128)], 100, "blue", proj(100, 20, 30));
      expect(ctx.rects).toHaveLength(30);
    });

    it("positions rects relative to view.start", () => {
      const ctx = mockCtx();
      // 400 peaks, 100px width. view.start=20, size=30
      drawWaveform(ctx, [uniformBin(400, 128)], 100, "blue", proj(100, 20, 30));
      // First visible column is clipPx=20 → x = 20-20 = 0
      expect(ctx.rects[0]!.x).toBe(0);
      // Last visible column is clipPx=49 → x = 49-20 = 29
      expect(ctx.rects[ctx.rects.length - 1]!.x).toBe(29);
    });

    it("takes max peak value per pixel column", () => {
      const ctx = mockCtx();
      const canvasH = 100;
      const centerY = canvasH / 2;
      // 4 peaks in 2px → 2 peaks per pixel
      // Bin: [0, 255, 128, 0]
      const bin = new Uint8Array([0, 255, 128, 0]);
      drawWaveform(ctx, [bin], canvasH, "blue", proj(2, 0, 2));
      // Column 0: peaks 0,1 → max=255, magnitude = (255/255)*50 = 50
      expect(ctx.rects[0]!.h).toBe(100); // 50 * 2
      // Column 1: peaks 2,3 → max=128
      const mag1 = (128 / 255) * centerY;
      expect(ctx.rects[1]!.h).toBeCloseTo(mag1 * 2);
    });
  });

  // --- Cross-cutting ---

  it("works across multiple bins", () => {
    const ctx = mockCtx();
    // Two bins of 3 peaks each = 6 peaks total, 200px width → upsample
    drawWaveform(ctx, [uniformBin(3, 128), uniformBin(3, 128)], 100, "blue", proj(200, 0, 200));
    expect(ctx.rects).toHaveLength(6);
  });

  it("law: upsample rect x equals peakIdx * scale - view.start", () => {
    const ctx = mockCtx();
    const width = 100;
    const nPeaks = 4;
    const scale = width / nPeaks; // 25
    const viewStart = 30;
    drawWaveform(ctx, [uniformBin(nPeaks, 128)], 100, "blue", proj(width, viewStart, 70));
    // Peak 0: clipX=0, end=25 < 30 → culled
    // Peak 1: clipX=25, end=50 >= 30 → visible, x = 25-30 = -5
    // Peak 2: clipX=50, x = 50-30 = 20
    // Peak 3: clipX=75, x = 75-30 = 45
    expect(ctx.rects).toHaveLength(3);
    expect(ctx.rects[0]!.x).toBeCloseTo(-5);
    expect(ctx.rects[1]!.x).toBeCloseTo(20);
    expect(ctx.rects[2]!.x).toBeCloseTo(45);
  });
});
