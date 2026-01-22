import { Schema } from "effect";
import * as Domain from "../domain";
import * as Ids from "../ids";

// Track events
export const TrackCreated = Schema.Struct({
	t: Schema.Literal("track.created"),
	track: Domain.Track,
});
export type TrackCreated = typeof TrackCreated.Type;

export const TrackDeleted = Schema.Struct({
	t: Schema.Literal("track.deleted"),
	trackId: Ids.TrackId,
});
export type TrackDeleted = typeof TrackDeleted.Type;

export const TrackRenamed = Schema.Struct({
	t: Schema.Literal("track.renamed"),
	trackId: Ids.TrackId,
	name: Schema.String,
});
export type TrackRenamed = typeof TrackRenamed.Type;

export const TrackColorChanged = Schema.Struct({
	t: Schema.Literal("track.colorChanged"),
	trackId: Ids.TrackId,
	color: Schema.String,
});
export type TrackColorChanged = typeof TrackColorChanged.Type;

export const TrackVolumeChanged = Schema.Struct({
	t: Schema.Literal("track.volumeChanged"),
	trackId: Ids.TrackId,
	volumeDb: Schema.Number,
});
export type TrackVolumeChanged = typeof TrackVolumeChanged.Type;

export const TrackPanChanged = Schema.Struct({
	t: Schema.Literal("track.panChanged"),
	trackId: Ids.TrackId,
	pan: Schema.Number,
});
export type TrackPanChanged = typeof TrackPanChanged.Type;

export const TrackMuteChanged = Schema.Struct({
	t: Schema.Literal("track.muteChanged"),
	trackId: Ids.TrackId,
	mute: Schema.Boolean,
});
export type TrackMuteChanged = typeof TrackMuteChanged.Type;

export const TrackSoloChanged = Schema.Struct({
	t: Schema.Literal("track.soloChanged"),
	trackId: Ids.TrackId,
	solo: Schema.Boolean,
});
export type TrackSoloChanged = typeof TrackSoloChanged.Type;

export const TrackClipsReordered = Schema.Struct({
	t: Schema.Literal("track.clipsReordered"),
	trackId: Ids.TrackId,
	clipIds: Schema.Array(Ids.ClipId),
});
export type TrackClipsReordered = typeof TrackClipsReordered.Type;

export const TrackEvent = Schema.Union(
	TrackCreated,
	TrackDeleted,
	TrackRenamed,
	TrackColorChanged,
	TrackVolumeChanged,
	TrackPanChanged,
	TrackMuteChanged,
	TrackSoloChanged,
	TrackClipsReordered,
);
export type TrackEvent = typeof TrackEvent.Type;
