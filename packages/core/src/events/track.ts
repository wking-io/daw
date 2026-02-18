import { Schema } from "effect";
import { Track, TrackColor } from "../domain/track";
import * as Ids from "../ids";

// Track events
export const TrackCreated = Schema.Struct({
  t: Schema.Literal("track.created"),
  track: Track,
});
export type TrackCreated = Schema.Schema.Type<typeof TrackCreated>;

export const TrackDeleted = Schema.Struct({
  t: Schema.Literal("track.deleted"),
  trackId: Ids.TrackId,
});
export type TrackDeleted = Schema.Schema.Type<typeof TrackDeleted>;

export const TrackRenamed = Schema.Struct({
  t: Schema.Literal("track.renamed"),
  trackId: Ids.TrackId,
  name: Schema.String,
});
export type TrackRenamed = Schema.Schema.Type<typeof TrackRenamed>;

export const TrackColorChanged = Schema.Struct({
  t: Schema.Literal("track.colorChanged"),
  trackId: Ids.TrackId,
  color: TrackColor,
});
export type TrackColorChanged = Schema.Schema.Type<typeof TrackColorChanged>;

export const TrackVolumeChanged = Schema.Struct({
  t: Schema.Literal("track.volumeChanged"),
  trackId: Ids.TrackId,
  volumeDb: Schema.Number,
});
export type TrackVolumeChanged = Schema.Schema.Type<typeof TrackVolumeChanged>;

export const TrackPanChanged = Schema.Struct({
  t: Schema.Literal("track.panChanged"),
  trackId: Ids.TrackId,
  pan: Schema.Number,
});
export type TrackPanChanged = Schema.Schema.Type<typeof TrackPanChanged>;

export const TrackMuteChanged = Schema.Struct({
  t: Schema.Literal("track.muteChanged"),
  trackId: Ids.TrackId,
  mute: Schema.Boolean,
});
export type TrackMuteChanged = Schema.Schema.Type<typeof TrackMuteChanged>;

export const TrackSoloChanged = Schema.Struct({
  t: Schema.Literal("track.soloChanged"),
  trackId: Ids.TrackId,
  solo: Schema.Boolean,
});
export type TrackSoloChanged = Schema.Schema.Type<typeof TrackSoloChanged>;

export const TrackCompactChanged = Schema.Struct({
  t: Schema.Literal("track.compactChanged"),
  trackId: Ids.TrackId,
  compact: Schema.Boolean,
});
export type TrackCompactChanged = Schema.Schema.Type<typeof TrackCompactChanged>;

export const TrackHeightMultiplierChanged = Schema.Struct({
  t: Schema.Literal("track.heightMultiplierChanged"),
  trackId: Ids.TrackId,
  heightMultiplier: Schema.Number,
});
export type TrackHeightMultiplierChanged = Schema.Schema.Type<typeof TrackHeightMultiplierChanged>;

export const TrackClipsReordered = Schema.Struct({
  t: Schema.Literal("track.clipsReordered"),
  trackId: Ids.TrackId,
  clipIds: Schema.Array(Ids.ClipId),
});
export type TrackClipsReordered = Schema.Schema.Type<typeof TrackClipsReordered>;

export const TrackEvent = Schema.Union(
  TrackCreated,
  TrackDeleted,
  TrackRenamed,
  TrackColorChanged,
  TrackVolumeChanged,
  TrackPanChanged,
  TrackMuteChanged,
  TrackSoloChanged,
  TrackCompactChanged,
  TrackHeightMultiplierChanged,
  TrackClipsReordered,
);
export type TrackEvent = Schema.Schema.Type<typeof TrackEvent>;
