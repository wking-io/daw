import { describe, expect, it } from "vitest";
import * as Vector2D from "../vector-2d";

describe("lib/vector-2d", () => {
	it("adds and subtracts vectors", () => {
		const a = Vector2D.make({ x: 2, y: -1 });
		const b = Vector2D.make({ x: -3, y: 4 });
		expect(Vector2D.add(a, b)).toEqual({ x: -1, y: 3 });
		expect(Vector2D.subtract(a, b)).toEqual({ x: 5, y: -5 });
	});

	it("normalizes vectors including zero vector", () => {
		expect(Vector2D.normalize(Vector2D.make({ x: 0, y: 0 }))).toEqual({
			x: 0,
			y: 0,
		});
		expect(Vector2D.normalize(Vector2D.make({ x: 3, y: 4 }))).toEqual({
			x: 0.6,
			y: 0.8,
		});
	});

	it("creates velocity from direction and speed", () => {
		const velocity = Vector2D.fromDirection(["up", "right"], 10);
		expect(velocity.x).toBeCloseTo(7.0710678118654755, 12);
		expect(velocity.y).toBeCloseTo(-7.0710678118654755, 12);

		const zeroVelocity = Vector2D.fromDirection("left", 0);
		expect(zeroVelocity.x).toBeCloseTo(0, 12);
		expect(zeroVelocity.y).toBeCloseTo(0, 12);
	});
});
