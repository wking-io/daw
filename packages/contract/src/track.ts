import { Schema } from "effect";
import { InstrumentId } from "./instrument";

export const TrackId = Schema.String.pipe(Schema.brand("TrackId"));
export type TrackId = typeof TrackId.Type;

export const Track = Schema.Struct({
	id: TrackId,
	name: Schema.String,
	instrumentId: InstrumentId,
});
export type Track = typeof Track.Type;
