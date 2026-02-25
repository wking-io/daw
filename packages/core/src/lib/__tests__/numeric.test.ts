import { describe, expect, it } from "bun:test";
import { Brand } from "effect";
import {
  add,
  subtract,
  multiply,
  divide,
  min,
  max,
  clamp,
  floor,
  ceil,
  eq,
  lte,
  lt,
  gt,
  gte,
} from "../numeric";

type TestBrand = number & Brand.Brand<"Test">;
const TestBrand = Brand.nominal<TestBrand>();

describe("lib/numeric", () => {
  describe("add", () => {
    it("adds two numbers", () => {
      expect(add(TestBrand(2), TestBrand(3))).toBe(TestBrand(5));
    });

    it("handles negative numbers", () => {
      expect(add(TestBrand(-4), TestBrand(7))).toBe(TestBrand(3));
    });

    it("identity: a + 0 = a", () => {
      expect(add(TestBrand(42), TestBrand(0))).toBe(TestBrand(42));
    });

    it("commutativity: a + b = b + a", () => {
      const a = TestBrand(3);
      const b = TestBrand(7);
      expect(add(a, b)).toBe(add(b, a));
    });
  });

  describe("subtract", () => {
    it("subtracts two numbers", () => {
      expect(subtract(TestBrand(10), TestBrand(3))).toBe(TestBrand(7));
    });

    it("produces negative results", () => {
      expect(subtract(TestBrand(3), TestBrand(10))).toBe(TestBrand(-7));
    });

    it("identity: a - 0 = a", () => {
      expect(subtract(TestBrand(42), TestBrand(0))).toBe(TestBrand(42));
    });

    it("self-inverse: a - a = 0", () => {
      const a = TestBrand(5);
      expect(subtract(a, a)).toBe(TestBrand(0));
    });
  });

  describe("multiply", () => {
    it("multiplies a branded value by a scalar", () => {
      expect(multiply(TestBrand(4), 3)).toBe(TestBrand(12));
    });

    it("identity: a * 1 = a", () => {
      expect(multiply(TestBrand(7), 1)).toBe(TestBrand(7));
    });

    it("zero: a * 0 = 0", () => {
      expect(multiply(TestBrand(99), 0)).toBe(TestBrand(0));
    });

    it("handles fractional scalars", () => {
      expect(multiply(TestBrand(10), 0.5)).toBe(TestBrand(5));
    });

    it("handles negative scalars", () => {
      expect(multiply(TestBrand(6), -2)).toBe(TestBrand(-12));
    });
  });

  describe("divide", () => {
    it("divides a branded value by a scalar", () => {
      expect(divide(TestBrand(9), 3)).toBe(TestBrand(3));
    });

    it("identity: a / 1 = a", () => {
      expect(divide(TestBrand(7), 1)).toBe(TestBrand(7));
    });

    it("handles non-integer results", () => {
      expect(divide(TestBrand(10), 3)).toBeCloseTo(10 / 3);
    });

    it("handles negative divisors", () => {
      expect(divide(TestBrand(12), -4)).toBe(TestBrand(-3));
    });
  });

  describe("min", () => {
    it("returns the smaller value", () => {
      expect(min(TestBrand(3), TestBrand(7))).toBe(TestBrand(3));
    });

    it("returns either when equal", () => {
      expect(min(TestBrand(5), TestBrand(5))).toBe(TestBrand(5));
    });

    it("handles negatives", () => {
      expect(min(TestBrand(-2), TestBrand(1))).toBe(TestBrand(-2));
    });

    it("idempotent: min(a, a) = a", () => {
      const a = TestBrand(4);
      expect(min(a, a)).toBe(TestBrand(a));
    });

    it("commutativity: min(a, b) = min(b, a)", () => {
      const a = TestBrand(3);
      const b = TestBrand(9);
      expect(min(a, b)).toBe(min(b, a));
    });
  });

  describe("max", () => {
    it("returns the larger value", () => {
      expect(max(TestBrand(3), TestBrand(7))).toBe(TestBrand(7));
    });

    it("returns either when equal", () => {
      expect(max(TestBrand(5), TestBrand(5))).toBe(TestBrand(5));
    });

    it("handles negatives", () => {
      expect(max(TestBrand(-2), TestBrand(1))).toBe(TestBrand(1));
    });

    it("idempotent: max(a, a) = a", () => {
      const a = TestBrand(4);
      expect(max(a, a)).toBe(TestBrand(a));
    });

    it("commutativity: max(a, b) = max(b, a)", () => {
      const a = TestBrand(3);
      const b = TestBrand(9);
      expect(max(a, b)).toBe(max(b, a));
    });
  });

  describe("clamp", () => {
    it("returns x when within range", () => {
      expect(clamp(TestBrand(5), TestBrand(0), TestBrand(10))).toBe(TestBrand(5));
    });

    it("clamps to low when below", () => {
      expect(clamp(TestBrand(-1), TestBrand(0), TestBrand(10))).toBe(TestBrand(0));
    });

    it("clamps to high when above", () => {
      expect(clamp(TestBrand(11), TestBrand(0), TestBrand(10))).toBe(TestBrand(10));
    });

    it("returns low when low = high", () => {
      expect(clamp(TestBrand(5), TestBrand(3), TestBrand(3))).toBe(TestBrand(3));
    });

    it("returns boundary when x equals boundary", () => {
      expect(clamp(TestBrand(0), TestBrand(0), TestBrand(10))).toBe(TestBrand(0));
      expect(clamp(TestBrand(10), TestBrand(0), TestBrand(10))).toBe(TestBrand(10));
    });

    it("law: result is always in [low, high]", () => {
      const values = [-100, -1, 0, 5, 10, 100];
      for (const x of values) {
        const result = clamp(TestBrand(x), TestBrand(0), TestBrand(10));
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("floor", () => {
    it("rounds down positive values", () => {
      expect(floor(TestBrand(3.7))).toBe(TestBrand(3));
    });

    it("is identity for integers", () => {
      expect(floor(TestBrand(5))).toBe(TestBrand(5));
    });

    it("rounds down negative values (toward -∞)", () => {
      expect(floor(TestBrand(-2.3))).toBe(TestBrand(-3));
    });
  });

  describe("ceil", () => {
    it("rounds up positive values", () => {
      expect(ceil(TestBrand(3.2))).toBe(TestBrand(4));
    });

    it("is identity for integers", () => {
      expect(ceil(TestBrand(5))).toBe(TestBrand(5));
    });

    it("rounds up negative values (toward +∞)", () => {
      expect(ceil(TestBrand(-2.7))).toBe(TestBrand(-2));
    });
  });

  describe("eq", () => {
    it("returns true for equal values", () => {
      expect(eq(TestBrand(5), TestBrand(5))).toBe(true);
    });

    it("returns false for unequal values", () => {
      expect(eq(TestBrand(5), TestBrand(6))).toBe(false);
    });

    it("uses strict equality (not coercion)", () => {
      expect(eq(TestBrand(0), TestBrand(-0))).toBe(true);
    });

    it("reflexive: eq(a, a) is always true", () => {
      const a = TestBrand(42);
      expect(eq(a, a)).toBe(true);
    });

    it("symmetric: eq(a, b) = eq(b, a)", () => {
      const a = TestBrand(3);
      const b = TestBrand(7);
      expect(eq(a, b)).toBe(eq(b, a));
    });
  });

  describe("lte", () => {
    it("true when a < b", () => {
      expect(lte(TestBrand(3), TestBrand(5))).toBe(true);
    });

    it("true when a = b", () => {
      expect(lte(TestBrand(5), TestBrand(5))).toBe(true);
    });

    it("false when a > b", () => {
      expect(lte(TestBrand(7), TestBrand(5))).toBe(false);
    });
  });

  describe("lt", () => {
    it("true when a < b", () => {
      expect(lt(TestBrand(3), TestBrand(5))).toBe(true);
    });

    it("false when a = b", () => {
      expect(lt(TestBrand(5), TestBrand(5))).toBe(false);
    });

    it("false when a > b", () => {
      expect(lt(TestBrand(7), TestBrand(5))).toBe(false);
    });
  });

  describe("gt", () => {
    it("true when a > b", () => {
      expect(gt(TestBrand(7), TestBrand(5))).toBe(true);
    });

    it("false when a = b", () => {
      expect(gt(TestBrand(5), TestBrand(5))).toBe(false);
    });

    it("false when a < b", () => {
      expect(gt(TestBrand(3), TestBrand(5))).toBe(false);
    });
  });

  describe("gte", () => {
    it("true when a > b", () => {
      expect(gte(TestBrand(7), TestBrand(5))).toBe(true);
    });

    it("true when a = b", () => {
      expect(gte(TestBrand(5), TestBrand(5))).toBe(true);
    });

    it("false when a < b", () => {
      expect(gte(TestBrand(3), TestBrand(5))).toBe(false);
    });
  });

  describe("comparison consistency", () => {
    it("lt and gte are complementary", () => {
      const pairs: [number, number][] = [
        [1, 2],
        [2, 2],
        [3, 2],
      ];
      for (const [a, b] of pairs) {
        expect(lt(TestBrand(a), TestBrand(b))).toBe(!gte(TestBrand(a), TestBrand(b)));
      }
    });

    it("gt and lte are complementary", () => {
      const pairs: [number, number][] = [
        [1, 2],
        [2, 2],
        [3, 2],
      ];
      for (const [a, b] of pairs) {
        expect(gt(TestBrand(a), TestBrand(b))).toBe(!lte(TestBrand(a), TestBrand(b)));
      }
    });

    it("eq implies both lte and gte", () => {
      const a = TestBrand(5);
      const b = TestBrand(5);
      expect(eq(a, b)).toBe(true);
      expect(lte(a, b)).toBe(true);
      expect(gte(a, b)).toBe(true);
    });
  });

  describe("laws", () => {
    const a = TestBrand(3);
    const b = TestBrand(7);
    const c = TestBrand(11);

    it("add associativity: (a + b) + c = a + (b + c)", () => {
      expect(add(add(a, b), c)).toBe(add(a, add(b, c)));
    });

    it("subtract is inverse of add: (a + b) - b = a", () => {
      expect(subtract(add(a, b), b)).toBe(a);
    });

    it("multiply distributes over add: (a + b) * s = a*s + b*s", () => {
      const s = 4;
      expect(multiply(add(a, b), s)).toBe(add(multiply(a, s), multiply(b, s)));
    });

    it("divide is inverse of multiply: (a * s) / s = a", () => {
      const s = 5;
      expect(divide(multiply(a, s), s)).toBeCloseTo(a);
    });

    it("min/max duality: min(a,b) + max(a,b) = a + b", () => {
      expect(add(min(a, b), max(a, b))).toBe(add(a, b));
    });

    it("clamp is min(max(x, low), high)", () => {
      const values = [-5, 0, 5, 10, 15];
      for (const x of values) {
        expect(clamp(x as TestBrand, 0 as TestBrand, 10 as TestBrand)).toBe(
          min(max(x as TestBrand, 0 as TestBrand), 10 as TestBrand),
        );
      }
    });

    it("floor/ceil bracket: floor(x) <= x <= ceil(x)", () => {
      for (const x of [0, 1.5, -1.5, 3, -3, 0.001, -0.001]) {
        expect(floor(x as TestBrand)).toBeLessThanOrEqual(x);
        expect(ceil(x as TestBrand)).toBeGreaterThanOrEqual(x);
      }
    });

    it("total order: for any a, b exactly one of lt, eq, gt holds", () => {
      const pairs: [number, number][] = [
        [1, 2],
        [2, 2],
        [3, 2],
      ];
      for (const [x, y] of pairs) {
        const isLt = lt(x as TestBrand, y as TestBrand);
        const isEq = eq(x as TestBrand, y as TestBrand);
        const isGt = gt(x as TestBrand, y as TestBrand);
        const count = [isLt, isEq, isGt].filter(Boolean).length;
        expect(count).toBe(1);
      }
    });
  });
});
