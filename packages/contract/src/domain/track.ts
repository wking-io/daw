import { Schema } from "effect";
import { DeviceId, ProjectId, TrackId } from "../ids";

export const TrackType = Schema.Literal("audio", "midi", "bus");
export type TrackType = typeof TrackType.Type;

export const Track = Schema.Struct({
	id: TrackId,
	projectId: ProjectId,
	type: TrackType,
	name: Schema.String,
	color: Schema.String,
	volumeDb: Schema.Number,
	pan: Schema.Number.pipe(Schema.between(-1, 1)),
	mute: Schema.Boolean,
	solo: Schema.Boolean,
	sortOrder: Schema.Number,
	deviceIds: Schema.Array(DeviceId), // stubbed for now
});
export type Track = typeof Track.Type;
