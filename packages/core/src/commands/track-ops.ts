import { Schema } from "effect";
import { TrackColor, TrackType } from "../domain/track";
import { ClipId, TrackId } from "../ids";

export const TrackCreate = Schema.Struct({
  t: Schema.Literal("track.create"),
  trackId: TrackId,
  type: TrackType,
  name: Schema.String,
  color: Schema.optional(TrackColor),
  index: Schema.optional(Schema.Number),
});
export type TrackCreate = Schema.Schema.Type<typeof TrackCreate>;

export const TrackDelete = Schema.Struct({
  t: Schema.Literal("track.delete"),
  trackId: TrackId,
});
export type TrackDelete = Schema.Schema.Type<typeof TrackDelete>;

export const TrackRename = Schema.Struct({
  t: Schema.Literal("track.rename"),
  trackId: TrackId,
  name: Schema.String,
});
export type TrackRename = Schema.Schema.Type<typeof TrackRename>;

export const TrackSetColor = Schema.Struct({
  t: Schema.Literal("track.setColor"),
  trackId: TrackId,
  color: TrackColor,
});
export type TrackSetColor = Schema.Schema.Type<typeof TrackSetColor>;

export const TrackSetVolume = Schema.Struct({
  t: Schema.Literal("track.setVolume"),
  trackId: TrackId,
  volumeDb: Schema.Number,
});
export type TrackSetVolume = Schema.Schema.Type<typeof TrackSetVolume>;

export const TrackSetPan = Schema.Struct({
  t: Schema.Literal("track.setPan"),
  trackId: TrackId,
  pan: Schema.Number,
});
export type TrackSetPan = Schema.Schema.Type<typeof TrackSetPan>;

export const TrackSetMute = Schema.Struct({
  t: Schema.Literal("track.setMute"),
  trackId: TrackId,
  mute: Schema.Boolean,
});
export type TrackSetMute = Schema.Schema.Type<typeof TrackSetMute>;

export const TrackSetSolo = Schema.Struct({
  t: Schema.Literal("track.setSolo"),
  trackId: TrackId,
  solo: Schema.Boolean,
});
export type TrackSetSolo = Schema.Schema.Type<typeof TrackSetSolo>;

export const TrackSetCompact = Schema.Struct({
  t: Schema.Literal("track.setCompact"),
  trackId: TrackId,
  compact: Schema.Boolean,
});
export type TrackSetCompact = Schema.Schema.Type<typeof TrackSetCompact>;

export const TrackSetHeightMultiplier = Schema.Struct({
  t: Schema.Literal("track.setHeightMultiplier"),
  trackId: TrackId,
  heightMultiplier: Schema.Number,
});
export type TrackSetHeightMultiplier = Schema.Schema.Type<typeof TrackSetHeightMultiplier>;

export const TrackReorderClips = Schema.Struct({
  t: Schema.Literal("track.reorderClips"),
  trackId: TrackId,
  clipIds: Schema.Array(ClipId),
});
export type TrackReorderClips = Schema.Schema.Type<typeof TrackReorderClips>;

export const TrackOperation = Schema.Union(
  TrackCreate,
  TrackDelete,
  TrackRename,
  TrackSetColor,
  TrackSetVolume,
  TrackSetPan,
  TrackSetMute,
  TrackSetSolo,
  TrackSetCompact,
  TrackSetHeightMultiplier,
  TrackReorderClips,
);
export type TrackOperation = Schema.Schema.Type<typeof TrackOperation>;
