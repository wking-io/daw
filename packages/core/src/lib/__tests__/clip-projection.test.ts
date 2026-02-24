import { describe, expect, it } from "bun:test";
import * as ClipProjection from "../clip-projection";
import * as Crop from "../crop";

describe("ClipProjection", () => {
  it("identity crop passes through pixel width and viewport", () => {
    const crop = Crop.make(16, 16, 0);
    const p = ClipProjection.make(crop, 200, 30, 100);
    expect(p.clipWidth).toBe(200);
    expect(p.visibleLeft).toBe(30);
    expect(p.visibleWidth).toBe(100);
    expect(p.visibleRight).toBe(130);
  });

  it("scale-only crop stretches clipWidth", () => {
    // source=32, visible=16 → scale=2
    const crop = Crop.make(32, 16, 0);
    const p = ClipProjection.make(crop, 200, 0, 100);
    expect(p.clipWidth).toBe(400);
    expect(p.visibleLeft).toBe(0);
  });

  it("offset-only crop shifts visibleLeft", () => {
    // source=16, visible=16, offset=4 → ratio=0.25
    const crop = Crop.make(16, 16, 4);
    const p = ClipProjection.make(crop, 200, 0, 100);
    expect(p.clipWidth).toBe(200);
    expect(p.visibleLeft).toBe(50); // 200 * 0.25
  });

  it("combined scale and offset", () => {
    // source=32, visible=16, offset=4 → scale=2, ratio=0.25
    const crop = Crop.make(32, 16, 4);
    const p = ClipProjection.make(crop, 200, 10, 100);
    expect(p.clipWidth).toBe(400);            // 200 * 2
    expect(p.visibleLeft).toBe(60);           // 10 + 200 * 0.25
    expect(p.visibleRight).toBe(160);         // 60 + 100
    expect(p.visibleWidth).toBe(100);
  });

  // Laws

  it("law: visibleRight === visibleLeft + visibleWidth", () => {
    const cases = [
      { source: 32, visible: 16, offset: 4, pw: 200, vl: 10, vw: 100 },
      { source: 16, visible: 16, offset: 0, pw: 300, vl: 0, vw: 300 },
      { source: 64, visible: 32, offset: 16, pw: 100, vl: 50, vw: 80 },
      { source: 100, visible: 100, offset: 0, pw: 500, vl: 0, vw: 500 },
    ];
    for (const { source, visible, offset, pw, vl, vw } of cases) {
      const p = ClipProjection.make(Crop.make(source, visible, offset), pw, vl, vw);
      expect(p.visibleRight).toBeCloseTo(p.visibleLeft + p.visibleWidth);
    }
  });

  it("law: identity crop preserves all inputs", () => {
    for (const pw of [100, 200, 500]) {
      for (const vl of [0, 10, 50]) {
        const vw = pw - vl;
        const crop = Crop.make(pw, pw, 0);
        const p = ClipProjection.make(crop, pw, vl, vw);
        expect(p.clipWidth).toBe(pw);
        expect(p.visibleLeft).toBe(vl);
        expect(p.visibleWidth).toBe(vw);
      }
    }
  });
});
