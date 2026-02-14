import type { Numeric } from "./numeric";

export type Size<A extends number> = {
  width: A;
  height: A;
};

export const make = <A extends number>(N: Numeric<A>, width: number, height: number): Size<A> => ({
  width: N.make(width),
  height: N.make(height),
});
