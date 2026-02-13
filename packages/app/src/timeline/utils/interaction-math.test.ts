import { describe, expect, it } from "bun:test";
import * as Px from "@daw/core/lib/px";
import { deltaFrom, zoomFactorFromDelta } from "./interaction-math";

describe("timeline/utils/interaction-math", () => {
  describe("deltaFrom", () => {
    it("returns zero delta when pointer matches offset at origin", () => {
      // scale=1, pointer at 100px screen, offset 100px → at=100, nextStart=0, delta=0
      const result = deltaFrom(Px.Numeric, {
        x: Px.Px(100),
        scale: 1,
        offset: Px.Px(100),
      });
      expect(result).toBe(Px.Px(0));
    });

    it("computes delta from origin when no from is provided", () => {
      // scale=1, pointer at 200px, offset 50px → at=200, nextStart=150, delta=150
      const result = deltaFrom(Px.Numeric, {
        x: Px.Px(200),
        scale: 1,
        offset: Px.Px(50),
      });
      expect(result).toBe(Px.Px(150));
    });

    it("computes delta relative to from", () => {
      // scale=1, pointer at 200px, offset 50px → at=200, nextStart=150
      // from=100 → delta = 150-100 = 50
      const result = deltaFrom(Px.Numeric, {
        x: Px.Px(200),
        scale: 1,
        offset: Px.Px(50),
        from: Px.Px(100),
      });
      expect(result).toBe(Px.Px(50));
    });

    it("accounts for scale when converting screen to timeline", () => {
      // scale=2, pointer at 200px screen → at = 0 + 200/2 = 100 timeline
      // offset=30 → nextStart=70, from=0 → delta=70
      const result = deltaFrom(Px.Numeric, {
        x: Px.Px(200),
        scale: 2,
        offset: Px.Px(30),
      });
      expect(result).toBe(Px.Px(70));
    });

    it("returns negative delta when pointer is before from", () => {
      // scale=1, pointer at 50px, offset 0 → at=50, nextStart=50
      // from=100 → delta = 50-100 = -50
      const result = deltaFrom(Px.Numeric, {
        x: Px.Px(50),
        scale: 1,
        offset: Px.Px(0),
        from: Px.Px(100),
      });
      expect(result).toBe(Px.Px(-50));
    });

    it("works with fractional scale", () => {
      // scale=0.5, pointer at 100px screen → at = 0 + 100/0.5 = 200 timeline
      // offset=0 → nextStart=200, from=0 → delta=200
      const result = deltaFrom(Px.Numeric, {
        x: Px.Px(100),
        scale: 0.5,
        offset: Px.Px(0),
      });
      expect(result).toBe(Px.Px(200));
    });
  });

  describe("zoomFactorFromDelta", () => {
    it("returns 1 for zero delta (no zoom)", () => {
      expect(zoomFactorFromDelta(0)).toBe(1);
    });

    it("returns factor > 1 for negative delta (zoom in)", () => {
      const factor = zoomFactorFromDelta(-100);
      expect(factor).toBeGreaterThan(1);
    });

    it("returns factor < 1 for positive delta (zoom out)", () => {
      const factor = zoomFactorFromDelta(100);
      expect(factor).toBeLessThan(1);
      expect(factor).toBeGreaterThan(0);
    });

    it("doubles at delta = -rate", () => {
      expect(zoomFactorFromDelta(-350)).toBeCloseTo(2);
    });

    it("halves at delta = +rate", () => {
      expect(zoomFactorFromDelta(350)).toBeCloseTo(0.5);
    });

    it("uses custom rate", () => {
      // rate=100, delta=-100 → 2^(100/100) = 2
      expect(zoomFactorFromDelta(-100, 100)).toBeCloseTo(2);
      // rate=100, delta=100 → 2^(-100/100) = 0.5
      expect(zoomFactorFromDelta(100, 100)).toBeCloseTo(0.5);
    });

    it("is symmetric: inverse deltas produce reciprocal factors", () => {
      const zoomIn = zoomFactorFromDelta(-200);
      const zoomOut = zoomFactorFromDelta(200);
      expect(zoomIn * zoomOut).toBeCloseTo(1);
    });
  });
});
