import { Schema } from "effect";
import { TrackId } from "./track";

export const PatternId = Schema.String.pipe(Schema.brand("PatternId"));
export type PatternId = typeof PatternId.Type;

export const PatternStep = Schema.Struct({
	time: Schema.Number,
	value: Schema.Unknown,
});
export type PatternStep = typeof PatternStep.Type;

export const Pattern = Schema.Struct({
	id: PatternId,
	trackId: TrackId,
	steps: Schema.Array(PatternStep),
});
export type Pattern = typeof Pattern.Type;
