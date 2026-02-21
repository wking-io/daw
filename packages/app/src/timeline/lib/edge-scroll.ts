// edge-scroll.ts — Edge scroll math for drag interactions.
//
// When dragging near viewport edges, computes pixel-per-frame scroll
// deltas with quadratic acceleration (faster as pointer nears edge).

const EDGE_THRESHOLD = 40;
const MIN_SPEED = 1;
const MAX_SPEED = 20;

/** Quadratic acceleration: speed ramps from MIN to MAX as distFromEdge → 0. */
export function computeEdgeSpeed(distFromEdge: number, threshold = EDGE_THRESHOLD): number {
  if (distFromEdge >= threshold || distFromEdge < 0) return 0;
  const t = 1 - distFromEdge / threshold;
  return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * t * t;
}

export type EdgeDeltas = { dx: number; dy: number };

/**
 * Compute scroll deltas for both axes based on pointer position relative
 * to the horizontal (projection) and vertical scroll containers.
 */
export function computeEdgeDeltas(
  pointerClientX: number,
  pointerClientY: number,
  horizontalRect: DOMRect,
  verticalRect: DOMRect,
): EdgeDeltas {
  let dx = 0;
  let dy = 0;

  // Horizontal: check left/right edges of the projection container
  const distLeft = pointerClientX - horizontalRect.left;
  const distRight = horizontalRect.right - pointerClientX;
  if (distLeft < EDGE_THRESHOLD) {
    dx = -computeEdgeSpeed(distLeft);
  } else if (distRight < EDGE_THRESHOLD) {
    dx = computeEdgeSpeed(distRight);
  }

  // Vertical: check top/bottom edges of the vertical scroll container
  const distTop = pointerClientY - verticalRect.top;
  const distBottom = verticalRect.bottom - pointerClientY;
  if (distTop < EDGE_THRESHOLD) {
    dy = -computeEdgeSpeed(distTop);
  } else if (distBottom < EDGE_THRESHOLD) {
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
