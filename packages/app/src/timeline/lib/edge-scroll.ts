import * as Px from "@daw/core/lib/px";
import * as N from "@daw/core/lib/numeric";

// edge-scroll.ts — Edge scroll math for drag interactions.
//
// When dragging near viewport edges, computes pixel-per-frame scroll
// deltas with quadratic acceleration (faster as pointer nears edge).

const EDGE_THRESHOLD = Px.Px(40);
const MIN_SPEED = Px.Px(1);
const MAX_SPEED = Px.Px(20);

/** Quadratic acceleration: speed ramps from MIN to MAX as distFromEdge → 0. */
export function computeEdgeSpeed(distFromEdge: Px.Px, threshold = EDGE_THRESHOLD): Px.Px {
  if (distFromEdge >= threshold || distFromEdge < Px.zero) return Px.zero;
  const t = N.subtract(Px.Px(1), N.divide(distFromEdge, threshold));
  return N.add(MIN_SPEED, N.multiply(N.subtract(MAX_SPEED, MIN_SPEED), N.multiply(t, t)));
}

export type EdgeDeltas = { dx: Px.Px; dy: Px.Px };

/**
 * Compute scroll deltas for both axes based on pointer position relative
 * to the horizontal (projection) and vertical scroll containers.
 */
export function computeEdgeDeltas(
  pointerClientX: Px.Px,
  pointerClientY: Px.Px,
  horizontalRect: DOMRect,
  verticalRect: DOMRect,
): EdgeDeltas {
  let dx = Px.zero;
  let dy = Px.zero;

  // Horizontal: check left/right edges of the projection container
  const distLeft = N.subtract(pointerClientX, Px.Px(horizontalRect.left));
  const distRight = N.subtract(Px.Px(horizontalRect.right), pointerClientX);
  if (N.lt(distLeft, EDGE_THRESHOLD)) {
    dx = N.negate(computeEdgeSpeed(distLeft));
  } else if (N.lt(distRight, EDGE_THRESHOLD)) {
    dx = computeEdgeSpeed(distRight);
  }

  // Vertical: check top/bottom edges of the vertical scroll container
  const distTop = N.subtract(pointerClientY, Px.Px(verticalRect.top));
  const distBottom = N.subtract(Px.Px(verticalRect.bottom), pointerClientY);
  if (N.lt(distTop, EDGE_THRESHOLD)) {
    dy = N.negate(computeEdgeSpeed(distTop));
  } else if (N.lt(distBottom, EDGE_THRESHOLD)) {
    dy = computeEdgeSpeed(distBottom);
  }

  return { dx, dy };
}

/**
 * Check if a pointer position is outside a rect.
 */
export function isOutOfBounds(
  pointerClientX: number,
  pointerClientY: number,
  rect: DOMRect,
): boolean {
  return (
    pointerClientX < rect.left ||
    pointerClientX > rect.right ||
    pointerClientY < rect.top ||
    pointerClientY > rect.bottom
  );
}
