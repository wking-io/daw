import { describe, expect, it } from "bun:test";
import * as Range from "../range";
import { Default as N } from "../numeric";

describe("Range", () => {
  describe("clamp", () => {
    const outer = Range.make(N, 0, 10);

    it("returns the inner range unchanged when fully inside", () => {
      const inner = Range.make(N, 2, 8);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 2, end: 8 });
    });

    it("clamps start to outer start when below", () => {
      const inner = Range.make(N, -5, 8);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 0, end: 8 });
    });

    it("clamps end to outer end when above", () => {
      const inner = Range.make(N, 2, 15);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 2, end: 10 });
    });

    it("clamps both start and end when fully outside", () => {
      const inner = Range.make(N, -5, 20);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 0, end: 10 });
    });

    it("collapses to outer start when inner is entirely below", () => {
      const inner = Range.make(N, -10, -2);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 0, end: 0 });
    });

    it("collapses to outer end when inner is entirely above", () => {
      const inner = Range.make(N, 15, 20);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 10, end: 10 });
    });

    it("handles inner matching outer exactly", () => {
      const inner = Range.make(N, 0, 10);
      expect(Range.clamp(N, inner, outer)).toEqual({ start: 0, end: 10 });
    });

    it("works with negative outer bounds", () => {
      const neg = Range.make(N, -10, -2);
      const inner = Range.make(N, -15, 5);
      expect(Range.clamp(N, inner, neg)).toEqual({ start: -10, end: -2 });
    });
  });

  describe("map", () => {
    it("applies function to both start and end", () => {
      const r = Range.make(N, 2, 10);
      expect(Range.map(r, (n) => n * 3)).toEqual({ start: 6, end: 30 });
    });

    it("can map to a different numeric type", () => {
      const r = Range.make(N, 4, 8);
      expect(Range.map(r, (n) => n * 0.5)).toEqual({ start: 2, end: 4 });
    });

    it("identity function returns equivalent range", () => {
      const r = Range.make(N, 3, 7);
      expect(Range.map(r, (n) => n)).toEqual({ start: 3, end: 7 });
    });
  });

  describe("width", () => {
    it("returns the difference between end and start", () => {
      expect(Range.width(N, Range.make(N, 0, 10))).toBe(10);
    });

    it("returns zero for a zero-width range", () => {
      expect(Range.width(N, Range.make(N, 5, 5))).toBe(0);
    });

    it("works with negative bounds", () => {
      expect(Range.width(N, Range.make(N, -10, -2))).toBe(8);
    });

    it("works with a range crossing zero", () => {
      expect(Range.width(N, Range.make(N, -3, 7))).toBe(10);
    });
  });
});
