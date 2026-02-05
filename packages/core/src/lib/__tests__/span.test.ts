import { describe, expect, it } from "bun:test";
import * as Numeric from "../numeric";
import * as Span from "../span";

describe("lib/span", () => {
  describe("make", () => {
    it("creates a span with start and size", () => {
      const span = Span.make(Numeric.Default, 10, 5);
      expect(span).toEqual({ start: 10, size: 5 });
    });

    it("uses Numeric.make for start and size", () => {
      const N: Numeric.Numeric<number> = {
        ...Numeric.Default,
        make: (n) => n * 2,
      };
      const span = Span.make(N, 5, 3);
      expect(span).toEqual({ start: 10, size: 6 });
    });
  });

  describe("center", () => {
    it("returns the center point of the span", () => {
      const span = { start: 10, size: 20 };
      expect(Span.center(Numeric.Default, span)).toBe(20);
    });

    it("handles odd-sized spans", () => {
      const span = { start: 0, size: 5 };
      expect(Span.center(Numeric.Default, span)).toBe(2.5);
    });
  });

  describe("end", () => {
    it("returns start + size", () => {
      const span = { start: 10, size: 20 };
      expect(Span.end(Numeric.Default, span)).toBe(30);
    });

    it("handles zero size", () => {
      const span = { start: 10, size: 0 };
      expect(Span.end(Numeric.Default, span)).toBe(10);
    });
  });

  describe("move", () => {
    it("shifts the span by delta, preserving size", () => {
      const span = { start: 10, size: 20 };
      const moved = Span.move(Numeric.Default, span, 5);
      expect(moved).toEqual({ start: 15, size: 20 });
    });

    it("handles negative delta", () => {
      const span = { start: 10, size: 20 };
      const moved = Span.move(Numeric.Default, span, -5);
      expect(moved).toEqual({ start: 5, size: 20 });
    });
  });

  describe("transform", () => {
    it("applies function to both start and size", () => {
      const span = { start: 10, size: 20 };
      const transformed = Span.transform(span, (n) => n * 2);
      expect(transformed).toEqual({ start: 20, size: 40 });
    });
  });

  describe("map", () => {
    it("maps start and size to different numeric type", () => {
      const span = { start: 10, size: 20 };
      // Map to a scaled value
      const mapped = Span.map(span, (n) => n * 0.5);
      expect(mapped).toEqual({ start: 5, size: 10 });
    });
  });

  describe("withStart", () => {
    it("returns span with new start, preserving size", () => {
      const span = { start: 10, size: 20 };
      const updated = Span.withStart(span, 50);
      expect(updated).toEqual({ start: 50, size: 20 });
    });
  });

  describe("withSize", () => {
    it("returns span with new size, preserving start", () => {
      const span = { start: 10, size: 20 };
      const updated = Span.withSize(span, 50);
      expect(updated).toEqual({ start: 10, size: 50 });
    });
  });

  describe("toRange", () => {
    it("converts span to range (start, start + size)", () => {
      const span = { start: 10, size: 20 };
      const range = Span.toRange(Numeric.Default, span);
      expect(range).toEqual({ start: 10, end: 30 });
    });

    it("handles zero size", () => {
      const span = { start: 10, size: 0 };
      const range = Span.toRange(Numeric.Default, span);
      expect(range).toEqual({ start: 10, end: 10 });
    });
  });
});
