import { describe, expect, it } from "vitest";
import { clamp } from "./math";

describe("timeline/lib/math", () => {
	it("clamps within inclusive [min, max]", () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(clamp(11, 0, 10)).toBe(10);
	});

	it("handles edge values", () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});
});
