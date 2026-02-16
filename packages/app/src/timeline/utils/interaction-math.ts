import type { Numeric } from "@daw/core/lib/numeric";
import * as Projection from "@daw/core/lib/projection";
import type * as Px from "@daw/core/lib/px";

export function deltaFrom<A extends number>(
  N: Numeric<A>,
  {
    x,
    scale,
    offset,
    from,
  }: {
    x: Px.Px;
    offset: A;
    scale: number;
    from?: A;
  },
): A {
  const at = Projection.fromScreen(N, N.zero, x, scale);
  const nextStart = N.subtract(at, offset);
  return N.subtract(nextStart, from ?? N.zero);
}

export function zoomFactorFromDelta(dy: number, viewSize: number): number {
  const logRate = 50 * Math.max(Math.log2(viewSize), 1);
  return Math.pow(2, -dy / logRate);
}
