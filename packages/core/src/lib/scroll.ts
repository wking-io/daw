import * as Projection from "./projection";

export function width<A extends number, B extends number>(size: A, scale: number): B {
  return Projection.to(0 as A, size, scale);
}

export function toScroll<A extends number, B extends number>(start: A, scale: number): B {
  return Projection.to(0 as A, start, scale);
}

export function fromScroll<A extends number, B extends number>(scroll: B, scale: number): A {
  return Projection.from(0 as A, scroll, scale);
}
