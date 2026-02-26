import { describe, expect, it } from "bun:test";
import * as ClipProjection from "../clip-projection";
import * as Crop from "../crop";
import * as Span from "../span";
import * as Px from "../px";

describe("ClipProjection", () => {
  it("identity crop passes through view.size and width", () => {
    const crop = Crop.make(16, 16, 0); // scale=1, ratio=0
    const p = ClipProjection.make(crop, Px.Px(200), Span.make(Px.Px(30), Px.Px(100)));
    expect(p.scale).toBe(200 / 16);
    expect(p.view.start).toBe(Px.Px(0)); // ratio=0
    expect(p.view.size).toBe(Px.Px(100)); // visible width passed through
    expect(p.width).toBe(Px.Px(200)); // 200 * 1
  });

  it("scale-only crop stretches width", () => {
    // source=32, visible=16 → scale=2
    const crop = Crop.make(32, 16, 0);
    const p = ClipProjection.make(crop, Px.Px(200), Span.make(Px.Px(0), Px.Px(200)));
    expect(p.scale).toBe(400 / 32);
    expect(p.view.start).toBe(Px.Px(0));
    expect(p.view.size).toBe(Px.Px(200)); // visible width passed through
    expect(p.width).toBe(Px.Px(400)); // 200 * 2
  });

  it("offset-only crop shifts view.start", () => {
    // source=16, visible=16, offset=4 → ratio=0.25
    const crop = Crop.make(16, 16, 4);
    const p = ClipProjection.make(crop, Px.Px(200), Span.make(Px.Px(0), Px.Px(200)));
    expect(p.view.start).toBe(Px.Px(50)); // (0+200) * 0.25
    expect(p.view.size).toBe(Px.Px(200));
    expect(p.width).toBe(Px.Px(200)); // 200 * 1
  });

  it("combined scale and offset", () => {
    // source=32, visible=16, offset=4 → scale=2, ratio=0.25
    const crop = Crop.make(32, 16, 4);
    const p = ClipProjection.make(crop, Px.Px(200), Span.make(Px.Px(10), Px.Px(100)));
    expect(p.scale).toBe(400 / 32);
    expect(p.view.start).toBeCloseTo(52.5); // (10+200) * 0.25
    expect(p.view.size).toBe(Px.Px(100)); // visible width passed through
    expect(p.width).toBe(Px.Px(400)); // 200 * 2
  });

  // Laws

  it("law: Span.end(view) === view.start + view.size", () => {
    const cases = [
      { source: 32, visible: 16, offset: 4, start: 10, size: 200, w: 100 },
      { source: 16, visible: 16, offset: 0, start: 0, size: 300, w: 300 },
      { source: 64, visible: 32, offset: 16, start: 50, size: 100, w: 80 },
      { source: 100, visible: 100, offset: 0, start: 0, size: 500, w: 500 },
    ];
    for (const { source, visible, offset, start, size, w } of cases) {
      const p = ClipProjection.make(
        Crop.make(source, visible, offset),
        Px.Px(size),
        Span.make(Px.Px(start), Px.Px(w)),
      );
      expect(Span.end(p.view)).toBeCloseTo(p.view.start + p.view.size);
    }
  });

  it("law: identity crop preserves view.size and width", () => {
    for (const size of [100, 200, 500]) {
      for (const start of [0, 10, 50]) {
        const crop = Crop.make(size, size, 0);
        const p = ClipProjection.make(crop, Px.Px(size), Span.make(Px.Px(start), Px.Px(size)));
        expect(p.view.size).toBe(Px.Px(size));
        expect(p.width).toBe(Px.Px(size));
        expect(p.view.start).toBe(Px.Px(0)); // ratio=0
      }
    }
  });
});
