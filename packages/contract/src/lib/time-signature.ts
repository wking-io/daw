import { Schema } from "effect";

export const Denominator = Schema.Literal(1, 2, 4, 8, 16);
export type Denominator = typeof Denominator.Type;

export const Numerator = Schema.Number.pipe(
	Schema.int(),
	Schema.between(1, 32),
);
export type Numerator = typeof Numerator.Type;

export const TimeSignature = Schema.Struct({
	numerator: Numerator,
	denominator: Denominator,
});
export type TimeSignature = typeof TimeSignature.Type;

// Constructor with validation
export const make = (
	numerator: number,
	denominator: 1 | 2 | 4 | 8 | 16,
): TimeSignature => {
	if (numerator < 1 || numerator > 32 || !Number.isInteger(numerator)) {
		throw new Error(`Invalid numerator: ${numerator}. Must be integer 1-32.`);
	}
	return { numerator, denominator };
};

// Common presets
export const common = make(4, 4);
export const waltz = make(3, 4);
export const cut = make(2, 2);
export const compound = make(6, 8);
