// crop.ts — A visible sub-interval within a larger source
import * as N from "./numeric";

export type Crop<A extends number> = {
  source: A;
  visible: A;
  offset: A;
};

export function make<A extends number>(
  source: A,
  visible: A,
  offset: A,
): Crop<A> {
  return { source, visible, offset };
}

export function scale<A extends number>(c: Crop<A>): number {
  return c.visible === 0 ? 1 : c.source / c.visible;
}

export function ratio<A extends number>(c: Crop<A>): number {
  return c.visible === 0 ? 0 : c.offset / c.visible;
}

export function isIdentity<A extends number>(c: Crop<A>): boolean {
  return c.source === c.visible && c.offset === 0;
}

export function move<A extends number>(c: Crop<A>, delta: A): Crop<A> {
  return { ...c, offset: N.add(c.offset, delta) };
}
