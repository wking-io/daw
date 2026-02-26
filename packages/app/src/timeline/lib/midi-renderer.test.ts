import { describe, expect, it } from "bun:test";
import type { MidiNote } from "@daw/core/domain/midi";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import { drawMidiNotes } from "./midi-renderer";

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

function note(pitch: number, start: number, size: number): MidiNote {
  return {
    id: `note-${pitch}-${start}` as any,
    pitch,
    velocity: 100,
    span: Span.make(QN.QN(start), QN.QN(size)),
  };
}

/** Construct a ClipProjection directly for renderer-level tests. */
function proj(scale: number, viewStart: number, viewSize: number, width: number): ClipProjection {
  return {
    scale,
    view: Span.make(Px.Px(viewStart), Px.Px(viewSize)),
    width: Px.Px(width),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("drawMidiNotes", () => {
  it("does nothing for an empty notes array", () => {
    const ctx = mockCtx();
    drawMidiNotes(ctx, [], 100, "red", proj(10, 0, 200, 200));
    expect(ctx.rects).toHaveLength(0);
  });

  it("renders a single note inside the visible window", () => {
    const ctx = mockCtx();
    // scale=10, note at 0 size 1 → clipX=0, w=10. view [0,200) → visible
    drawMidiNotes(ctx, [note(60, 0, 1)], 100, "red", proj(10, 0, 200, 200));
    expect(ctx.rects.length).toBeGreaterThan(0);
  });

  it("sets fillStyle to the provided color", () => {
    const ctx = mockCtx();
    drawMidiNotes(ctx, [note(60, 0, 1)], 100, "#ff0000", proj(10, 0, 200, 200));
    expect(ctx.fillStyle).toBe("#ff0000");
  });

  it("culls notes entirely to the left of the visible window", () => {
    const ctx = mockCtx();
    // scale=10, note at 0 size 1 → clipX=0, w=10. view.start=300 → clipX+w (10) < 300 → culled
    drawMidiNotes(ctx, [note(60, 0, 1)], 100, "red", proj(10, 300, 200, 500));
    expect(ctx.rects).toHaveLength(0);
  });

  it("culls notes entirely to the right of the visible window", () => {
    const ctx = mockCtx();
    // scale=10, note at 50 size 1 → clipX=500. view end = 0+200=200 → clipX (500) > 200 → culled
    drawMidiNotes(ctx, [note(60, 50, 1)], 100, "red", proj(10, 0, 200, 600));
    expect(ctx.rects).toHaveLength(0);
  });

  it("renders notes that partially overlap the visible window on the left", () => {
    const ctx = mockCtx();
    // scale=10, note at 0 size 4 → clipX=0, w=40. view [20,60). clipX+w=40 >= 20, clipX=0 < 60 → visible
    drawMidiNotes(ctx, [note(60, 0, 4)], 100, "red", proj(10, 20, 40, 100));
    expect(ctx.rects.length).toBeGreaterThan(0);
  });

  it("renders notes that partially overlap the visible window on the right", () => {
    const ctx = mockCtx();
    // scale=10, note at 5 size 4 → clipX=50, w=40. view [0,60). clipX+w=90 >= 0, clipX=50 < 60 → visible
    drawMidiNotes(ctx, [note(60, 5, 4)], 100, "red", proj(10, 0, 60, 100));
    expect(ctx.rects.length).toBeGreaterThan(0);
  });

  it("positions note x = (start - offset) * scale - view.start", () => {
    const ctx = mockCtx();
    // scale=10, note at 2, offset=0, view.start=0 → x = 2*10 - 0 = 20
    drawMidiNotes(ctx, [note(60, 2, 1)], 100, "red", proj(10, 0, 200, 200), 0);
    expect(ctx.rects[0]!.x).toBe(20);
    expect(ctx.rects[0]!.w).toBe(10); // 1 * 10
  });

  it("subtracts offset from note start before scaling", () => {
    const ctx = mockCtx();
    // scale=10, note start=5, offset=2 → clipX = (5-2)*10 = 30, x = 30 - 0 = 30
    drawMidiNotes(ctx, [note(60, 5, 1)], 100, "red", proj(10, 0, 200, 200), 2);
    expect(ctx.rects[0]!.x).toBe(30);
  });

  it("shifts x when view.start is nonzero", () => {
    const ctx = mockCtx();
    // scale=10, note at 2, offset=0, view.start=15 → clipX=20, x = 20 - 15 = 5
    drawMidiNotes(ctx, [note(60, 2, 1)], 100, "red", proj(10, 15, 100, 200), 0);
    expect(ctx.rects[0]!.x).toBe(5);
  });

  it("maps pitch to y coordinate — higher pitch is closer to top", () => {
    const ctx = mockCtx();
    const canvasH = 100;
    const notes = [note(60, 0, 1), note(70, 1, 1)];
    drawMidiNotes(ctx, notes, canvasH, "red", proj(10, 0, 200, 200), 0);
    expect(ctx.rects).toHaveLength(2);
    // note(60) lower pitch → higher y, note(70) higher pitch → lower y
    expect(ctx.rects[1]!.y).toBeLessThan(ctx.rects[0]!.y);
  });

  it("enforces minimum note width of 1px", () => {
    const ctx = mockCtx();
    // scale=1, note size=0.001 → raw w = 0.001, clamped to 1
    drawMidiNotes(ctx, [note(60, 0, 0.001)], 100, "red", proj(1, 0, 100, 100), 0);
    expect(ctx.rects[0]!.w).toBe(1);
  });

  it("enforces minimum note height of 1px", () => {
    const ctx = mockCtx();
    // canvasH=1, pitchRange will be >= MIN_SLOTS(18) → noteH = 1/18 clamped to 1
    drawMidiNotes(ctx, [note(60, 0, 1)], 1, "red", proj(10, 0, 100, 100), 0);
    expect(ctx.rects[0]!.h).toBeGreaterThanOrEqual(1);
  });

  it("law: rendered x equals (start - offset) * scale - view.start", () => {
    const cases = [
      { start: 0, offset: 0, scale: 10, viewStart: 0 },
      { start: 5, offset: 2, scale: 10, viewStart: 0 },
      { start: 3, offset: 0, scale: 20, viewStart: 10 },
      { start: 8, offset: 3, scale: 5, viewStart: 5 },
    ];
    for (const c of cases) {
      const ctx = mockCtx();
      const expected = (c.start - c.offset) * c.scale - c.viewStart;
      const width = Math.max(200, expected + 100);
      drawMidiNotes(
        ctx,
        [note(60, c.start, 1)],
        100,
        "red",
        proj(c.scale, c.viewStart, width, width),
        c.offset,
      );
      expect(ctx.rects[0]!.x).toBeCloseTo(expected);
    }
  });
});
