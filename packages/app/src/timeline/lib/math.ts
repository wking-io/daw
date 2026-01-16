export const EPSILON = 1e-9;

export function clamp(x: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, x));
}

export function nearly(a: number, b: number, eps = EPSILON): boolean {
	return Math.abs(a - b) < eps;
}
