// px.ts
import { Brand, Schema as S } from "effect";
import * as QN from "./qn";
import * as Projection from "./projection";

export type Px = number & Brand.Brand<"Px">;
export const Px = Brand.nominal<Px>();
export const Schema = S.Number.pipe(S.fromBrand(Px));
export const zero = Px(0);

export function fromQN(qn: QN.QN, scale: number): Px {
  return Projection.to(QN.zero, qn, scale);
}

export function toQN(px: Px, scale: number): QN.QN {
  return Projection.from(QN.zero, px, scale);
}
