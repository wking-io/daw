import { Schema } from "effect";
import type { Numeric } from "../lib/numeric";

// Quarter-note position (branded for type safety)
export const QN = Schema.Number.pipe(Schema.brand("QN"));
export type QN = typeof QN.Type;

// QN-specific Numeric instance for use with Span/Range
export const QNNumeric: Numeric<QN> = {
	make: (n) => n as QN,
	zero: 0 as QN,
	add: (a, b) => (a + b) as QN,
	subtract: (a, b) => (a - b) as QN,
	multiply: (a, b) => (a * b) as QN,
	divide: (a, b) => (a / b) as QN,
	min: (a, b) => Math.min(a, b) as QN,
	max: (a, b) => Math.max(a, b) as QN,
	clamp: (x, low, high) => Math.min(Math.max(x, low), high) as QN,
	eq: (a, b) => a === b,
	lte: (a, b) => a <= b,
	lt: (a, b) => a < b,
	gt: (a, b) => a > b,
	gte: (a, b) => a >= b,
};
