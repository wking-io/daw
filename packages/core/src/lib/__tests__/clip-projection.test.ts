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
    expect(p.view.start).toBe(Px.Px(30)); // view.start + width*ratio = 30 + 200*0
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
    expect(p.view.start).toBeCloseTo(60); // view.start + width*ratio = 10 + 200*0.25
    expect(p.view.size).toBe(Px.Px(100)); // visible width passed through
    expect(p.width).toBe(Px.Px(400)); // 200 * 2
  });

  it("clip partially off-screen left accounts for off-screen portion", () => {
    // Simulates a clip that extends past the left viewport edge:
    // 1000px wide clip with 500px off-screen, so view.start=500, visible=500px
    const crop = Crop.make(10, 10, 2); // scale=1, ratio=0.2
    const p = ClipProjection.make(crop, Px.Px(1000), Span.make(Px.Px(500), Px.Px(500)));
    // Content offset = off-screen portion + crop offset = 500 + 1000*0.2 = 700
    expect(p.view.start).toBe(Px.Px(700));
    expect(p.view.size).toBe(Px.Px(500));
  });

  it("clip fully on-screen has view.start equal to crop offset only", () => {
    const crop = Crop.make(10, 10, 2); // scale=1, ratio=0.2
    const p = ClipProjection.make(crop, Px.Px(1000), Span.make(Px.Px(0), Px.Px(1000)));
    // No off-screen portion, so content offset is just the crop offset
    expect(p.view.start).toBe(Px.Px(200)); // 0 + 1000*0.2
    expect(p.view.size).toBe(Px.Px(1000));
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
        expect(p.view.start).toBe(Px.Px(start)); // view.start + size*0 = start
      }
    }
  });
});
