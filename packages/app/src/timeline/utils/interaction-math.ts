import * as N from "@daw/core/lib/numeric";
import * as Projection from "@daw/core/lib/projection";
import type * as Px from "@daw/core/lib/px";

export function deltaFrom<A extends number>({
  x,
  scale,
  offset,
  from,
}: {
  x: Px.Px;
  offset: A;
  scale: number;
  from?: A;
}): A {
  const at = Projection.from(0 as A, x, scale);
  const nextStart = N.subtract(at, offset);
  return N.subtract(nextStart, from ?? (0 as A));
}

export function zoomFactorFromDelta<A extends number>(dy: number, viewSize: A): number {
  const logRate = 50 * Math.log2(1 + viewSize);
  return Math.pow(2, -dy / logRate);
}
