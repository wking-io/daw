import { describe, expect, it } from "vitest";
import * as Px from "../px";

describe("timeline/lib/px", () => {
	it("brands and performs arithmetic", () => {
		const a = Px.Px(10);
		const b = Px.Px(3);

		expect(Px.add(a, b)).toBe(Px.Px(13));
		expect(Px.subtract(a, b)).toBe(Px.Px(7));
		expect(Px.multiply(a, 2)).toBe(Px.Px(20));
		expect(Px.divide(a, 2)).toBe(Px.Px(5));
	});

	it("min/max/clamp", () => {
		const low = Px.Px(0);
		const high = Px.Px(10);

		expect(Px.min(Px.Px(1), Px.Px(2))).toBe(Px.Px(1));
		expect(Px.max(Px.Px(1), Px.Px(2))).toBe(Px.Px(2));

		expect(Px.clamp(Px.Px(5), low, high)).toBe(Px.Px(5));
		expect(Px.clamp(Px.Px(-1), low, high)).toBe(Px.Px(0));
		expect(Px.clamp(Px.Px(11), low, high)).toBe(Px.Px(10));
	});

	it("Numeric behaves like a Numeric for Px", () => {
		const N = Px.Numeric;
		expect(N.add(Px.Px(1), Px.Px(2))).toBe(Px.Px(3));
		expect(N.clamp(Px.Px(11), Px.Px(0), Px.Px(10))).toBe(Px.Px(10));
	});
});
