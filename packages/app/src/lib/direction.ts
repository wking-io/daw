import type * as Point2D from "./point-2d";
import * as Vector2D from "./vector-2d";

export const CARDINAL_DIRECTIONS = ["up", "down", "left", "right"] as const;

export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

export type Direction =
	| CardinalDirection
	| [CardinalDirection, CardinalDirection];

export function randomCardinalDirection(): CardinalDirection {
	return CARDINAL_DIRECTIONS[
		Math.floor(Math.random() * CARDINAL_DIRECTIONS.length)
	];
}

export function moveX(direction: Direction) {
	if (Array.isArray(direction)) {
		return direction.some((d) => d === "right")
			? 1
			: direction.some((d) => d === "left")
				? -1
				: 0;
	}
	return direction === "right" ? 1 : direction === "left" ? -1 : 0;
}

export function moveY(direction: Direction) {
	if (Array.isArray(direction)) {
		return direction.some((d) => d === "down")
			? 1
			: direction.some((d) => d === "up")
				? -1
				: 0;
	}
	return direction === "down" ? 1 : direction === "up" ? -1 : 0;
}

export function toCardinal(direction: Direction) {
	if (Array.isArray(direction)) {
		return direction[0];
	}
	return direction;
}

export function toVector(direction: Direction): Vector2D.Vector2D {
	const directionMap = {
		right: Vector2D.make({ x: 1, y: 0 }),
		left: Vector2D.make({ x: -1, y: 0 }),
		up: Vector2D.make({ x: 0, y: -1 }),
		down: Vector2D.make({ x: 0, y: 1 }),
	};

	const vector = Vector2D.make({ x: 0, y: 0 });

	if (Array.isArray(direction)) {
		return direction.reduce(
			(acc, dir) =>
				Vector2D.add(
					acc,
					Vector2D.make({
						x: directionMap[dir].x,
						y: directionMap[dir].y,
					}),
				),
			vector,
		);
	}

	return directionMap[direction] || vector;
}

export function fromPoints(from: Point2D.Point2D, to: Point2D.Point2D) {
	const dx = to.x - from.x;
	const dy = to.y - from.y;

	// Prioritize the larger movement
	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? "right" : "left";
	} else {
		return dy > 0 ? "down" : "up";
	}
}
