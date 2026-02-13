// projection.ts
import type { Numeric } from "./numeric";
import * as Px from "./px";

export function scaleFor<A extends number>(N: Numeric<A>, size: A, width: Px.Px): number {
  return N.make(width / size);
}

export function toScreen<A extends number>(N: Numeric<A>, from: A, at: A, scale: number): Px.Px {
  return Px.Px(N.subtract(at, from) * scale);
}

export function fromScreen<A extends number>(N: Numeric<A>, from: A, at: Px.Px, scale: number): A {
  return N.make(from + at / scale);
}
