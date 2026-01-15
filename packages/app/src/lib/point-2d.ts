import { Brand, Option, Schema } from "effect";
import type * as Direction from "./direction";
import type * as Vector2D from "./vector-2d";

export type Point2D = {
	x: number;
	y: number;
} & Brand.Brand<"Point2D">;

export const make = Brand.nominal<Point2D>();

export function toIndex(point: Point2D): string {
	return `${point.x},${point.y}`;
}

const indexSchema = Schema.TemplateLiteralParser(
	Schema.Number,
	",",
	Schema.Number,
);
const indexDecoder = Schema.decodeOption(indexSchema);

export function fromIndex(
	index: `${number},${number}`,
): Option.Option<Point2D> {
	return Option.map(indexDecoder(index), ([x, _, y]) => make({ x, y }));
}

export function equals(a: Point2D, b: Point2D): boolean {
	return a.x === b.x && a.y === b.y;
}

export function add(p: Point2D, v: Vector2D.Vector2D): Point2D {
	return make({ x: p.x + v.x, y: p.y + v.y });
}

export function clone(point: Point2D): Point2D {
	return make({ x: point.x, y: point.y });
}

export function move(
	point: Point2D,
	direction: Direction.CardinalDirection,
	amount = 1,
): Point2D {
	switch (direction) {
		case "up":
			return make({ x: point.x, y: point.y - amount });
		case "down":
			return make({ x: point.x, y: point.y + amount });
		case "left":
			return make({ x: point.x - amount, y: point.y });
		case "right":
			return make({ x: point.x + amount, y: point.y });
	}
}
