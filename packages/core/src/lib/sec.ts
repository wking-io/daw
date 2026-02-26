// sec.ts — Seconds (wall-clock time)
import { Brand, Schema as S } from "effect";
import * as QN from "./qn";
import * as Projection from "./projection";

export type Sec = number & Brand.Brand<"Sec">;
export const Sec = Brand.nominal<Sec>();
export const Schema = S.Number.pipe(S.fromBrand(Sec));
export const zero = Sec(0);

export function fromQN(qn: QN.QN, bpm: number): Sec {
  return Projection.to(QN.zero, qn, Projection.scaleFor(bpm, 60));
}

export function toQN(sec: Sec, bpm: number): QN.QN {
  return Projection.from(QN.zero, sec, Projection.scaleFor(bpm, 60));
}
