// qn.ts — Quarter-note position (musically meaningful coordinate space)
import { Brand, Schema as S } from "effect";
import * as N from "./numeric";

export type QN = number & Brand.Brand<"QN">;
export const QN = Brand.nominal<QN>();
export const Schema = S.Number.pipe(S.fromBrand(QN));

export const zero = QN(0);

export const add = (a: QN, b: QN): QN => QN(N.add(a, b));

export const subtract = (a: QN, b: QN): QN => QN(N.subtract(a, b));

export const multiply = (a: QN, b: number): QN => QN(N.multiply(a, b));

export const divide = (a: QN, b: number): QN => QN(N.divide(a, b));

export const min = (a: QN, b: QN): QN => QN(N.min(a, b));

export const max = (a: QN, b: QN): QN => QN(N.max(a, b));

export const clamp = (x: QN, low: QN, high: QN): QN => QN(N.clamp(x, low, high));

export const eq = (a: QN, b: QN): boolean => N.eq(a, b);

export const lte = (a: QN, b: QN): boolean => N.lte(a, b);

export const lt = (a: QN, b: QN): boolean => N.lt(a, b);

export const gt = (a: QN, b: QN): boolean => N.gt(a, b);

export const gte = (a: QN, b: QN): boolean => N.gte(a, b);

export const Numeric: N.Numeric<QN> = {
  make: QN,
  zero,
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
