import { Schema } from "effect";
import { InstrumentId } from "./instrument";
export const TrackId = Schema.String.pipe(Schema.brand("TrackId"));
export const Track = Schema.Struct({
	id: TrackId,
	name: Schema.String,
	instrumentId: InstrumentId,
});
