export type Size<A extends number> = {
  width: A;
  height: A;
};

export const make = <A extends number>(width: A, height: A): Size<A> => ({
  width,
  height,
});
