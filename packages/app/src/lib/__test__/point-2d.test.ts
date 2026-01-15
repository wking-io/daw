import { Option } from "effect";
import { describe, expect, it } from "vitest";
import * as Point2D from "../point-2d";
import * as Vector2D from "../vector-2d";

describe("lib/point-2d", () => {
	it("round-trips through index", () => {
		const point = Point2D.make({ x: 3, y: -2 });
		expect(Point2D.toIndex(point)).toBe("3,-2");
		const decoded = Point2D.fromIndex("3,-2");
		expect(Option.getOrNull(decoded)).toEqual(point);
	});

	it("compares points for equality", () => {
		const a = Point2D.make({ x: 2, y: 5 });
		const b = Point2D.make({ x: 2, y: 5 });
		const c = Point2D.make({ x: 2, y: 6 });
		expect(Point2D.equals(a, b)).toBe(true);
		expect(Point2D.equals(a, c)).toBe(false);
	});

	it("adds a vector to a point", () => {
		const point = Point2D.make({ x: 1, y: 1 });
		const vector = Vector2D.make({ x: -2, y: 3 });
		expect(Point2D.add(point, vector)).toEqual({ x: -1, y: 4 });
	});

	it("clones a point", () => {
		const point = Point2D.make({ x: 7, y: 9 });
		expect(Point2D.clone(point)).toEqual(point);
	});

	it("moves by direction and amount", () => {
		const origin = Point2D.make({ x: 0, y: 0 });
		expect(Point2D.move(origin, "up")).toEqual({ x: 0, y: -1 });
		expect(Point2D.move(origin, "down", 3)).toEqual({ x: 0, y: 3 });
		expect(Point2D.move(origin, "left", 2)).toEqual({ x: -2, y: 0 });
		expect(Point2D.move(origin, "right", 4)).toEqual({ x: 4, y: 0 });
	});
});
