import { Schema } from "effect";
import { TrackId } from "./track";
export const PatternId = Schema.String.pipe(Schema.brand("PatternId"));
export const PatternStep = Schema.Struct({
	time: Schema.Number,
	value: Schema.Unknown,
});
export const Pattern = Schema.Struct({
	id: PatternId,
	trackId: TrackId,
	steps: Schema.Array(PatternStep),
});
