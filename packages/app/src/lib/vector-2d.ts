import { Brand, pipe } from "effect";
import * as Direction from "./direction";

export type Vector2D = {
	x: number;
	y: number;
} & Brand.Brand<"Vector2D">;

export const make = Brand.nominal<Vector2D>();

export function add(a: Vector2D, b: Vector2D): Vector2D {
	return make({ x: a.x + b.x, y: a.y + b.y });
}

export function subtract(a: Vector2D, b: Vector2D): Vector2D {
	return make({ x: a.x - b.x, y: a.y - b.y });
}

export function normalize({ x, y }: Vector2D): Vector2D {
	const magnitude = Math.sqrt(x * x + y * y);

	// Handle zero vector case
	if (magnitude === 0) {
		return make({ x: 0, y: 0 });
	}

	return make({
		x: x / magnitude,
		y: y / magnitude,
	});
}

// VELOCITY
export function fromDirection(direction: Direction.Direction, speed: number) {
	const unitVector = pipe(direction, Direction.toVector, normalize);

	return make({
		x: unitVector.x * speed,
		y: unitVector.y * speed,
	});
}
