export const EPSILON = 1e-9;

export function nearly(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}
