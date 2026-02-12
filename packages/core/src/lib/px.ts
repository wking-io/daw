// px.ts
import { Brand, Schema as S } from "effect";
import * as N from "./numeric";

export type Px = number & Brand.Brand<"Px">;
export const Px = Brand.nominal<Px>();
export const Schema = S.Number.pipe(S.fromBrand(Px));

export const add = (a: Px, b: Px): Px => Px(N.add(a, b));

export const subtract = (a: Px, b: Px): Px => Px(N.subtract(a, b));

export const multiply = (a: Px, b: number): Px => Px(N.multiply(a, b));

export const divide = (a: Px, b: number): Px => Px(N.divide(a, b));

export const min = (a: Px, b: Px): Px => Px(N.min(a, b));

export const max = (a: Px, b: Px): Px => Px(N.max(a, b));

export const clamp = (x: Px, low: Px, high: Px): Px => Px(N.clamp(x, low, high));

export const eq = (a: Px, b: Px): boolean => N.eq(a, b);

export const lte = (a: Px, b: Px): boolean => N.lte(a, b);

export const lt = (a: Px, b: Px): boolean => N.lt(a, b);

export const gt = (a: Px, b: Px): boolean => N.gt(a, b);

export const gte = (a: Px, b: Px): boolean => N.gte(a, b);

export const Numeric: N.Numeric<Px> = {
  make: Px,
  zero: Px(0),
  add,
  subtract,
  multiply,
  divide,
  min,
  max,
  clamp,
  eq,
  lte,
  lt,
  gt,
  gte,
};
