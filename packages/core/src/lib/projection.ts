// projection.ts
import * as N from "./numeric";

export function scaleFor<A extends number, B extends number>(source: A, width: B): number {
  return width / source;
}

const toScale = <A extends number, B extends number>(value: A, scale: number): B =>
  (value * scale) as B;

const fromScale = <A extends number, B extends number>(value: B, scale: number): A =>
  (value / scale) as A;

export function to<A extends number, B extends number>(from: A, at: A, scale: number): B {
  return toScale(N.subtract(at, from), scale);
}

export function from<A extends number, B extends number>(from: A, at: B, scale: number): A {
  return N.add(from, fromScale(at, scale));
}
