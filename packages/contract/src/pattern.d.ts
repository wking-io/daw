import { Schema } from "effect";
export declare const PatternId: Schema.brand<typeof Schema.String, "PatternId">;
export type PatternId = typeof PatternId.Type;
export declare const PatternStep: Schema.Struct<{
	time: typeof Schema.Number;
	value: typeof Schema.Unknown;
}>;
export type PatternStep = typeof PatternStep.Type;
export declare const Pattern: Schema.Struct<{
	id: Schema.brand<typeof Schema.String, "PatternId">;
	trackId: Schema.brand<typeof Schema.String, "TrackId">;
	steps: Schema.Array$<
		Schema.Struct<{
			time: typeof Schema.Number;
			value: typeof Schema.Unknown;
		}>
	>;
}>;
export type Pattern = typeof Pattern.Type;
