import { Schema } from "effect";
import { describe, expect, it } from "bun:test";
import * as TimeSignature from "../time-signature";

describe("lib/time-signature", () => {
  describe("make", () => {
    it("creates a valid time signature", () => {
      const ts = TimeSignature.make(4, 4);
      expect(ts.numerator).toBe(4);
      expect(ts.denominator).toBe(4);
    });

    it("accepts valid numerators (1-32)", () => {
      expect(TimeSignature.make(1, 4).numerator).toBe(1);
      expect(TimeSignature.make(32, 4).numerator).toBe(32);
      expect(TimeSignature.make(7, 8).numerator).toBe(7);
    });

    it("accepts valid denominators (1, 2, 4, 8, 16)", () => {
      expect(TimeSignature.make(4, 1).denominator).toBe(1);
      expect(TimeSignature.make(4, 2).denominator).toBe(2);
      expect(TimeSignature.make(4, 4).denominator).toBe(4);
      expect(TimeSignature.make(4, 8).denominator).toBe(8);
      expect(TimeSignature.make(4, 16).denominator).toBe(16);
    });

    it("throws for numerator less than 1", () => {
      expect(() => TimeSignature.make(0, 4)).toThrow("Invalid numerator: 0. Must be integer 1-32.");
    });

    it("throws for numerator greater than 32", () => {
      expect(() => TimeSignature.make(33, 4)).toThrow(
        "Invalid numerator: 33. Must be integer 1-32.",
      );
    });

    it("throws for non-integer numerator", () => {
      expect(() => TimeSignature.make(4.5, 4)).toThrow(
        "Invalid numerator: 4.5. Must be integer 1-32.",
      );
    });
  });

  describe("presets", () => {
    it("common is 4/4", () => {
      expect(TimeSignature.common).toEqual({ numerator: 4, denominator: 4 });
    });

    it("waltz is 3/4", () => {
      expect(TimeSignature.waltz).toEqual({ numerator: 3, denominator: 4 });
    });

    it("cut is 2/2", () => {
      expect(TimeSignature.cut).toEqual({ numerator: 2, denominator: 2 });
    });

    it("compound is 6/8", () => {
      expect(TimeSignature.compound).toEqual({ numerator: 6, denominator: 8 });
    });
  });

  describe("schema", () => {
    it("TimeSignature schema validates correct structure", () => {
      const decoded = Schema.decodeUnknownSync(TimeSignature.TimeSignature)({
        numerator: 4,
        denominator: 4,
      });
      expect(decoded).toEqual({ numerator: 4, denominator: 4 });
    });

    it("TimeSignature schema rejects invalid numerator", () => {
      expect(() =>
        Schema.decodeUnknownSync(TimeSignature.TimeSignature)({
          numerator: 0,
          denominator: 4,
        }),
      ).toThrow();
    });

    it("TimeSignature schema rejects invalid denominator", () => {
      expect(() =>
        Schema.decodeUnknownSync(TimeSignature.TimeSignature)({
          numerator: 4,
          denominator: 3,
        }),
      ).toThrow();
    });
  });
});
