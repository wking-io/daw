import { Schema } from "effect";
import { QNSpan } from "../domain/clip";
import * as QN from "../lib/qn";
import * as Sec from "../lib/sec";
import { AudioFileId, ClipId, PatternId, TrackId } from "../ids";

export const ClipCreateMidi = Schema.Struct({
  t: Schema.Literal("clip.createMidi"),
  clipId: ClipId,
  newPatternId: PatternId,
  trackId: TrackId,
  span: QNSpan,
  cloneFromPatternId: Schema.optional(PatternId),
});
export type ClipCreateMidi = Schema.Schema.Type<typeof ClipCreateMidi>;

export const ClipCreateAudio = Schema.Struct({
  t: Schema.Literal("clip.createAudio"),
  clipId: ClipId,
  trackId: TrackId,
  span: QNSpan,
  audioFileId: AudioFileId,
  offset: Schema.optional(Sec.Schema),
});
export type ClipCreateAudio = Schema.Schema.Type<typeof ClipCreateAudio>;

export const ClipDelete = Schema.Struct({
  t: Schema.Literal("clip.delete"),
  clipId: ClipId,
});
export type ClipDelete = Schema.Schema.Type<typeof ClipDelete>;

export const ClipMove = Schema.Struct({
  t: Schema.Literal("clip.move"),
  clipId: ClipId,
  start: QN.Schema,
  trackId: Schema.optional(TrackId),
});
export type ClipMove = Schema.Schema.Type<typeof ClipMove>;

export const ClipResize = Schema.Struct({
  t: Schema.Literal("clip.resize"),
  clipId: ClipId,
  span: QNSpan,
});
export type ClipResize = Schema.Schema.Type<typeof ClipResize>;

export const ClipSetLoop = Schema.Struct({
  t: Schema.Literal("clip.setLoop"),
  clipId: ClipId,
  loop: QNSpan,
});
export type ClipSetLoop = Schema.Schema.Type<typeof ClipSetLoop>;

export const ClipRemoveLoop = Schema.Struct({
  t: Schema.Literal("clip.removeLoop"),
  clipId: ClipId,
});
export type ClipRemoveLoop = Schema.Schema.Type<typeof ClipRemoveLoop>;

export const ClipOperation = Schema.Union(
  ClipCreateMidi,
  ClipCreateAudio,
  ClipDelete,
  ClipMove,
  ClipResize,
  ClipSetLoop,
  ClipRemoveLoop,
);
export type ClipOperation = Schema.Schema.Type<typeof ClipOperation>;
