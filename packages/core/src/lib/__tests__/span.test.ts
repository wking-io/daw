import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import * as Span from "../span";

const s = (start: number, size: number): Span.Span<number> => ({ start, size });
const r = (start: number, end: number) => ({ start, end });

describe("lib/span", () => {
  describe("make", () => {
    it("creates a span with start and size", () => {
      const span = Span.make(10, 5);
      expect(span).toEqual({ start: 10, size: 5 });
    });
  });

  describe("center", () => {
    it("returns the center point of the span", () => {
      const span = { start: 10, size: 20 };
      expect(Span.center(span)).toBe(20);
    });

    it("handles odd-sized spans", () => {
      const span = { start: 0, size: 5 };
      expect(Span.center(span)).toBe(2.5);
    });
  });

  describe("end", () => {
    it("returns start + size", () => {
      const span = { start: 10, size: 20 };
      expect(Span.end(span)).toBe(30);
    });

    it("handles zero size", () => {
      const span = { start: 10, size: 0 };
      expect(Span.end(span)).toBe(10);
    });
  });

  describe("move", () => {
    it("shifts the span by delta, preserving size", () => {
      const span = { start: 10, size: 20 };
      const moved = Span.move(span, 5);
      expect(moved).toEqual({ start: 15, size: 20 });
    });

    it("handles negative delta", () => {
      const span = { start: 10, size: 20 };
      const moved = Span.move(span, -5);
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

  describe("overlaps", () => {
    it("disjoint spans do not overlap", () => {
      expect(Span.overlaps({ start: 0, size: 5 }, { start: 10, size: 5 })).toBe(false);
    });

    it("touching (adjacent) spans do not overlap (half-open)", () => {
      expect(Span.overlaps({ start: 0, size: 5 }, { start: 5, size: 5 })).toBe(false);
    });

    it("partially overlapping spans overlap", () => {
      expect(Span.overlaps({ start: 0, size: 10 }, { start: 5, size: 10 })).toBe(true);
    });

    it("containment: inner within outer", () => {
      expect(Span.overlaps({ start: 0, size: 20 }, { start: 5, size: 5 })).toBe(true);
    });

    it("containment: outer around inner", () => {
      expect(Span.overlaps({ start: 5, size: 5 }, { start: 0, size: 20 })).toBe(true);
    });

    it("identical spans overlap", () => {
      expect(Span.overlaps({ start: 3, size: 7 }, { start: 3, size: 7 })).toBe(true);
    });

    it("zero-size span does not overlap", () => {
      expect(Span.overlaps({ start: 5, size: 0 }, { start: 0, size: 10 })).toBe(false);
      expect(Span.overlaps({ start: 0, size: 10 }, { start: 5, size: 0 })).toBe(false);
    });

    describe("laws", () => {
      const pairs: [Span.Span<number>, Span.Span<number>][] = [
        [
          { start: 0, size: 10 },
          { start: 5, size: 10 },
        ],
        [
          { start: 0, size: 5 },
          { start: 10, size: 5 },
        ],
        [
          { start: 0, size: 20 },
          { start: 5, size: 5 },
        ],
      ];

      it("symmetry: overlaps(a,b) === overlaps(b,a)", () => {
        for (const [a, b] of pairs) {
          expect(Span.overlaps(a, b)).toBe(Span.overlaps(b, a));
        }
      });

      it("reflexive for non-empty spans", () => {
        expect(Span.overlaps({ start: 0, size: 5 }, { start: 0, size: 5 })).toBe(true);
        expect(Span.overlaps({ start: 10, size: 1 }, { start: 10, size: 1 })).toBe(true);
      });

      it("zero-size is never reflexive", () => {
        expect(Span.overlaps({ start: 5, size: 0 }, { start: 5, size: 0 })).toBe(false);
      });
    });
  });

  describe("intersection", () => {
    it("disjoint spans return None", () => {
      expect(Span.intersection({ start: 0, size: 5 }, { start: 10, size: 5 })).toEqual(
        Option.none(),
      );
    });

    it("touching spans return None", () => {
      expect(Span.intersection({ start: 0, size: 5 }, { start: 5, size: 5 })).toEqual(
        Option.none(),
      );
    });

    it("partial overlap returns shared region", () => {
      expect(Span.intersection({ start: 0, size: 10 }, { start: 5, size: 10 })).toEqual(
        Option.some({ start: 5, size: 5 }),
      );
    });

    it("containment returns inner span", () => {
      expect(Span.intersection({ start: 0, size: 20 }, { start: 5, size: 5 })).toEqual(
        Option.some({ start: 5, size: 5 }),
      );
    });

    it("containment (reversed) returns inner span", () => {
      expect(Span.intersection({ start: 5, size: 5 }, { start: 0, size: 20 })).toEqual(
        Option.some({ start: 5, size: 5 }),
      );
    });

    it("identical spans return the same span", () => {
      expect(Span.intersection({ start: 3, size: 7 }, { start: 3, size: 7 })).toEqual(
        Option.some({ start: 3, size: 7 }),
      );
    });

    it("zero-size span returns None", () => {
      expect(Span.intersection({ start: 5, size: 0 }, { start: 0, size: 10 })).toEqual(
        Option.none(),
      );
    });

    describe("laws", () => {
      const pairs: [Span.Span<number>, Span.Span<number>][] = [
        [
          { start: 0, size: 10 },
          { start: 5, size: 10 },
        ],
        [
          { start: 0, size: 5 },
          { start: 10, size: 5 },
        ],
        [
          { start: 0, size: 20 },
          { start: 5, size: 5 },
        ],
        [
          { start: 3, size: 7 },
          { start: 3, size: 7 },
        ],
      ];

      it("commutativity: intersection(a,b) === intersection(b,a)", () => {
        for (const [a, b] of pairs) {
          expect(Span.intersection(a, b)).toEqual(Span.intersection(b, a));
        }
      });

      it("consistent with overlaps: overlaps ⟺ intersection is Some", () => {
        for (const [a, b] of pairs) {
          expect(Span.overlaps(a, b)).toBe(Option.isSome(Span.intersection(a, b)));
        }
      });

      it("subset: result is within both inputs", () => {
        for (const [a, b] of pairs) {
          const i = Span.intersection(a, b);
          if (Option.isSome(i)) {
            expect(i.value.start).toBeGreaterThanOrEqual(Math.max(a.start, b.start));
            expect(Span.end(i.value)).toBeLessThanOrEqual(Math.min(Span.end(a), Span.end(b)));
          }
        }
      });
    });
  });

  describe("subtract", () => {
    it("disjoint: returns [a] unchanged", () => {
      expect(Span.subtract({ start: 0, size: 5 }, { start: 10, size: 5 })).toEqual([
        { start: 0, size: 5 },
      ]);
    });

    it("touching: returns [a] unchanged", () => {
      expect(Span.subtract({ start: 0, size: 5 }, { start: 5, size: 5 })).toEqual([
        { start: 0, size: 5 },
      ]);
    });

    it("b fully covers a: returns []", () => {
      expect(Span.subtract({ start: 5, size: 5 }, { start: 0, size: 20 })).toEqual([]);
    });

    it("identical spans: returns []", () => {
      expect(Span.subtract({ start: 3, size: 7 }, { start: 3, size: 7 })).toEqual([]);
    });

    it("left overlap: trims right side of a", () => {
      expect(Span.subtract({ start: 0, size: 10 }, { start: 5, size: 10 })).toEqual([
        { start: 0, size: 5 },
      ]);
    });

    it("right overlap: trims left side of a", () => {
      expect(Span.subtract({ start: 5, size: 10 }, { start: 0, size: 10 })).toEqual([
        { start: 10, size: 5 },
      ]);
    });

    it("straddle: b is inside a, returns two pieces", () => {
      expect(Span.subtract(s(0, 20), s(5, 5))).toEqual([
        { start: 0, size: 5 },
        { start: 10, size: 10 },
      ]);
    });

    it("zero-size b: returns [a] unchanged", () => {
      expect(Span.subtract({ start: 0, size: 10 }, { start: 5, size: 0 })).toEqual([
        { start: 0, size: 10 },
      ]);
    });

    describe("laws", () => {
      const cases: [Span.Span<number>, Span.Span<number>][] = [
        [
          { start: 0, size: 10 },
          { start: 5, size: 10 },
        ], // partial overlap
        [
          { start: 5, size: 5 },
          { start: 0, size: 20 },
        ], // b covers a
        [
          { start: 0, size: 20 },
          { start: 5, size: 5 },
        ], // straddle
        [
          { start: 0, size: 5 },
          { start: 10, size: 5 },
        ], // disjoint
        [
          { start: 3, size: 7 },
          { start: 3, size: 7 },
        ], // identical
      ];

      it("conservation: sum of result sizes === a.size - intersection.size", () => {
        for (const [a, b] of cases) {
          const results = Span.subtract(a, b);
          const resultSum = results.reduce((s, r) => s + r.size, 0);
          const interSize = Option.match(Span.intersection(a, b), {
            onNone: () => 0,
            onSome: (i) => i.size,
          });
          expect(resultSum).toBe(a.size - interSize);
        }
      });

      it("disjointness: result pieces do not overlap each other", () => {
        for (const [a, b] of cases) {
          const results = Span.subtract(a, b);
          for (let i = 0; i < results.length; i++) {
            for (let j = i + 1; j < results.length; j++) {
              expect(Span.overlaps(results[i]!, results[j]!)).toBe(false);
            }
          }
        }
      });

      it("coverage: every result piece is within a", () => {
        for (const [a, b] of cases) {
          const aEnd = Span.end(a);
          for (const r of Span.subtract(a, b)) {
            expect(r.start).toBeGreaterThanOrEqual(a.start);
            expect(Span.end(r)).toBeLessThanOrEqual(aEnd);
          }
        }
      });

      it("no-op when disjoint: subtract returns [a]", () => {
        const a = { start: 0, size: 5 };
        const b = { start: 10, size: 5 };
        expect(Span.subtract(a, b)).toEqual([a]);
      });

      it("annihilation: subtract returns [] when b contains a", () => {
        const a = { start: 5, size: 5 };
        const b = { start: 0, size: 20 };
        expect(Span.subtract(a, b)).toEqual([]);
      });

      it("positive size: every result has size > 0", () => {
        for (const [a, b] of cases) {
          for (const r of Span.subtract(a, b)) {
            expect(r.size).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  describe("toRange", () => {
    it("converts start and size to start and end", () => {
      expect(Span.toRange(s(2, 8))).toEqual({ start: 2, end: 10 });
    });

    it("handles zero size", () => {
      expect(Span.toRange(s(5, 0))).toEqual({ start: 5, end: 5 });
    });

    it("handles negative start", () => {
      expect(Span.toRange(s(-3, 7))).toEqual({ start: -3, end: 4 });
    });
  });

  describe("fromRange", () => {
    it("converts start and end to start and size", () => {
      expect(Span.fromRange(r(2, 10))).toEqual({ start: 2, size: 8 });
    });

    it("handles zero-width range", () => {
      expect(Span.fromRange(r(5, 5))).toEqual({ start: 5, size: 0 });
    });

    it("handles negative bounds", () => {
      expect(Span.fromRange(r(-10, -2))).toEqual({ start: -10, size: 8 });
    });

    it("roundtrips with toRange", () => {
      const span = s(3, 12);
      expect(Span.fromRange(Span.toRange(span))).toEqual(span);
    });
  });
});
