import { describe, expect, it } from "vitest";
import * as Numeric from "./numeric";

describe("timeline/lib/numeric", () => {
	it("basic arithmetic", () => {
		expect(Numeric.add(2, 3)).toBe(5);
		expect(Numeric.subtract(10, 3)).toBe(7);
		expect(Numeric.multiply(2, 3)).toBe(6);
		expect(Numeric.divide(9, 3)).toBe(3);
	});

	it("min/max", () => {
		expect(Numeric.min(1, 2)).toBe(1);
		expect(Numeric.max(1, 2)).toBe(2);
	});

	it("clamp constrains x to inclusive [low, high]", () => {
		expect(Numeric.clamp(5, 0, 10)).toBe(5);
		expect(Numeric.clamp(-1, 0, 10)).toBe(0);
		expect(Numeric.clamp(11, 0, 10)).toBe(10);
	});
});
