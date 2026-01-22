import { Schema } from "effect";
import { TrackType } from "../domain";
import { ClipId, TrackId } from "../ids";

export const TrackCreate = Schema.Struct({
	t: Schema.Literal("track.create"),
	type: TrackType,
	name: Schema.String,
	color: Schema.optional(Schema.String),
	index: Schema.optional(Schema.Number),
});
export type TrackCreate = typeof TrackCreate.Type;

export const TrackDelete = Schema.Struct({
	t: Schema.Literal("track.delete"),
	trackId: TrackId,
});
export type TrackDelete = typeof TrackDelete.Type;

export const TrackRename = Schema.Struct({
	t: Schema.Literal("track.rename"),
	trackId: TrackId,
	name: Schema.String,
});
export type TrackRename = typeof TrackRename.Type;

export const TrackSetColor = Schema.Struct({
	t: Schema.Literal("track.setColor"),
	trackId: TrackId,
	color: Schema.String,
});
export type TrackSetColor = typeof TrackSetColor.Type;

export const TrackSetVolume = Schema.Struct({
	t: Schema.Literal("track.setVolume"),
	trackId: TrackId,
	volumeDb: Schema.Number,
});
export type TrackSetVolume = typeof TrackSetVolume.Type;

export const TrackSetPan = Schema.Struct({
	t: Schema.Literal("track.setPan"),
	trackId: TrackId,
	pan: Schema.Number,
});
export type TrackSetPan = typeof TrackSetPan.Type;

export const TrackSetMute = Schema.Struct({
	t: Schema.Literal("track.setMute"),
	trackId: TrackId,
	mute: Schema.Boolean,
});
export type TrackSetMute = typeof TrackSetMute.Type;

export const TrackSetSolo = Schema.Struct({
	t: Schema.Literal("track.setSolo"),
	trackId: TrackId,
	solo: Schema.Boolean,
});
export type TrackSetSolo = typeof TrackSetSolo.Type;

export const TrackReorderClips = Schema.Struct({
	t: Schema.Literal("track.reorderClips"),
	trackId: TrackId,
	clipIds: Schema.Array(ClipId),
});
export type TrackReorderClips = typeof TrackReorderClips.Type;

export const TrackOperation = Schema.Union(
	TrackCreate,
	TrackDelete,
	TrackRename,
	TrackSetColor,
	TrackSetVolume,
	TrackSetPan,
	TrackSetMute,
	TrackSetSolo,
	TrackReorderClips,
);
export type TrackOperation = typeof TrackOperation.Type;
