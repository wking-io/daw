export const add = <A extends number>(a: A, b: A): A => (a + b) as A;

export const subtract = <A extends number>(a: A, b: A): A => (a - b) as A;

export const multiply = <A extends number>(a: A, b: number): A => (a * b) as A;

export const divide = <A extends number>(a: A, b: number): A => (a / b) as A;

export const min = <A extends number>(a: A, b: A): A => Math.min(a, b) as A;

export const max = <A extends number>(a: A, b: A): A => Math.max(a, b) as A;

export const clamp = <A extends number>(x: A, low: A, high: A): A => min(max(x, low), high);

export const floor = <A extends number>(x: A): A => Math.floor(x) as A;

export const ceil = <A extends number>(x: A): A => Math.ceil(x) as A;

export const round = <A extends number>(x: A): A => Math.round(x) as A;

export const eq = <A extends number>(a: A, b: A): boolean => a === b;

export const lte = <A extends number>(a: A, b: A): boolean => a <= b;

export const lt = <A extends number>(a: A, b: A): boolean => a < b;

export const gt = <A extends number>(a: A, b: A): boolean => a > b;

export const gte = <A extends number>(a: A, b: A): boolean => a >= b;

export const negate = <A extends number>(a: A): A => -a as A;
