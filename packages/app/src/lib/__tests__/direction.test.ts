import { describe, expect, it, vi } from "vitest";
import * as Direction from "../direction";
import * as Point2D from "../point-2d";

describe("lib/direction", () => {
	it("picks a random cardinal direction", () => {
		const randomSpy = vi.spyOn(Math, "random");
		randomSpy.mockReturnValueOnce(0);
		expect(Direction.randomCardinalDirection()).toBe("up");
		randomSpy.mockReturnValueOnce(0.51);
		expect(Direction.randomCardinalDirection()).toBe("left");
		randomSpy.mockRestore();
	});

	it("computes moveX and moveY for single directions", () => {
		expect(Direction.moveX("left")).toBe(-1);
		expect(Direction.moveX("right")).toBe(1);
		expect(Direction.moveX("up")).toBe(0);
		expect(Direction.moveY("up")).toBe(-1);
		expect(Direction.moveY("down")).toBe(1);
		expect(Direction.moveY("left")).toBe(0);
	});

	it("computes moveX and moveY for diagonal directions", () => {
		expect(Direction.moveX(["up", "right"])).toBe(1);
		expect(Direction.moveY(["up", "right"])).toBe(-1);
		expect(Direction.moveX(["up", "down"])).toBe(0);
		expect(Direction.moveY(["left", "right"])).toBe(0);
	});

	it("converts to cardinal direction", () => {
		expect(Direction.toCardinal("down")).toBe("down");
		expect(Direction.toCardinal(["left", "up"])).toBe("left");
	});

	it("converts to vectors", () => {
		expect(Direction.toVector("left")).toEqual({ x: -1, y: 0 });
		expect(Direction.toVector(["up", "right"])).toEqual({ x: 1, y: -1 });
		expect(Direction.toVector(["down", "down"])).toEqual({ x: 0, y: 2 });
	});

	it("chooses direction from points by larger delta", () => {
		expect(
			Direction.fromPoints(
				Point2D.make({ x: 0, y: 0 }),
				Point2D.make({ x: 4, y: 1 }),
			),
		).toBe("right");
		expect(
			Direction.fromPoints(
				Point2D.make({ x: 0, y: 0 }),
				Point2D.make({ x: -2, y: 1 }),
			),
		).toBe("left");
		expect(
			Direction.fromPoints(
				Point2D.make({ x: 0, y: 0 }),
				Point2D.make({ x: 1, y: 3 }),
			),
		).toBe("down");
		expect(
			Direction.fromPoints(
				Point2D.make({ x: 0, y: 0 }),
				Point2D.make({ x: 2, y: 2 }),
			),
		).toBe("down");
	});
});
