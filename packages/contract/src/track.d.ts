import { Schema } from "effect";
export declare const TrackId: Schema.brand<typeof Schema.String, "TrackId">;
export type TrackId = typeof TrackId.Type;
export declare const Track: Schema.Struct<{
	id: Schema.brand<typeof Schema.String, "TrackId">;
	name: typeof Schema.String;
	instrumentId: Schema.brand<typeof Schema.String, "InstrumentId">;
}>;
export type Track = typeof Track.Type;
