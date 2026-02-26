// qn.ts — Quarter-note position (musically meaningful coordinate space)
import { Brand, Schema as S } from "effect";

export type QN = number & Brand.Brand<"QN">;
export const QN = Brand.nominal<QN>();
export const Schema = S.Number.pipe(S.fromBrand(QN));
export const zero = QN(0);
