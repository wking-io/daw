import type { InteractiveNode, Point } from "./types";
import { pointInRect } from "./types";

/**
 * Perform hit testing on a list of interactive scene nodes.
 * Returns the action associated with the topmost node that contains the point,
 * or null if no interactive node was hit.
 *
 * Nodes are tested in reverse order (last drawn = on top = tested first).
 */
export function hitTest<Action>(
	nodes: readonly InteractiveNode<Action>[],
	point: Point,
): Action | null {
	// Test in reverse order - last node is on top
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i]!;
		const result = hitTestNode(node, point);
		if (result != null) return result;
	}
	return null;
}

function hitTestNode<Action>(
	node: InteractiveNode<Action>,
	point: Point,
): Action | null {
	switch (node.kind) {
		case "rect": {
			if (pointInRect(point, node.rect)) {
				return node.action ?? null;
			}
			return null;
		}

		case "line": {
			// Lines use a hit tolerance for easier clicking
			const HIT_TOLERANCE = 4; // pixels
			if (isPointNearLine(point, node.points, HIT_TOLERANCE)) {
				return node.action ?? null;
			}
			return null;
		}

		case "text": {
			return null;
		}

		case "group": {
			// First check children (they're on top of the group)
			for (let i = node.children.length - 1; i >= 0; i--) {
				const child = node.children[i] as InteractiveNode<Action>;
				const result = hitTestNode(child, point);
				if (result != null) return result;
			}

			// Then check if group itself has an action and point is within clip bounds
			if (node.action != null) {
				if (node.clip) {
					if (pointInRect(point, node.clip)) {
						return node.action;
					}
				} else {
					// Group without clip - action applies if any child was in bounds
					// But we already checked children, so this is a fallback
					return node.action;
				}
			}

			return null;
		}
	}
}

/**
 * Check if a point is within tolerance distance of any line segment.
 */
function isPointNearLine(
	point: Point,
	linePoints: readonly Point[],
	tolerance: number,
): boolean {
	if (linePoints.length < 2) return false;

	for (let i = 0; i < linePoints.length - 1; i++) {
		const x1 = linePoints[i]!.x;
		const y1 = linePoints[i]!.y;
		const x2 = linePoints[i + 1]!.x;
		const y2 = linePoints[i + 1]!.y;

		const dist = pointToSegmentDistance(point.x, point.y, x1, y1, x2, y2);
		if (dist <= tolerance) return true;
	}

	return false;
}

/**
 * Calculate the distance from a point to a line segment.
 */
function pointToSegmentDistance(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSq = dx * dx + dy * dy;

	if (lengthSq === 0) {
		// Segment is a point
		return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
	}

	// Project point onto line, clamped to segment
	const t = Math.max(
		0,
		Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq),
	);
	const projX = x1 + t * dx;
	const projY = y1 + t * dy;

	return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
