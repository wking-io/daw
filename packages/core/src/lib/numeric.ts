// Numeric typeclass for generic arithmetic operations
export interface Numeric<A extends number> {
	readonly make: (n: number) => A;
	readonly zero: A;
	readonly add: (a: A, b: A) => A;
	readonly subtract: (a: A, b: A) => A;
	readonly multiply: (a: A, b: number) => A;
	readonly divide: (a: A, b: number) => A;
	readonly min: (a: A, b: A) => A;
	readonly max: (a: A, b: A) => A;
	readonly clamp: (x: A, low: A, high: A) => A;
	readonly eq: (a: A, b: A) => boolean;
	readonly lte: (a: A, b: A) => boolean;
	readonly lt: (a: A, b: A) => boolean;
	readonly gt: (a: A, b: A) => boolean;
	readonly gte: (a: A, b: A) => boolean;
}

export const make = (n: number): number => n;

export const zero = 0;

export const add = (a: number, b: number): number => a + b;

export const subtract = (a: number, b: number): number => a - b;

export const multiply = (a: number, b: number): number => a * b;

export const divide = (a: number, b: number): number => a / b;

export const min = (a: number, b: number): number => Math.min(a, b);

export const max = (a: number, b: number): number => Math.max(a, b);

export const clamp = (x: number, low: number, high: number): number => {
	return Math.min(Math.max(x, low), high);
};

export const eq = (a: number, b: number): boolean => a === b;

export const lte = (a: number, b: number): boolean => a <= b;

export const lt = (a: number, b: number): boolean => a < b;

export const gt = (a: number, b: number): boolean => a > b;

export const gte = (a: number, b: number): boolean => a >= b;

// Default implementation for plain numbers
export const Default: Numeric<number> = {
	make,
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
