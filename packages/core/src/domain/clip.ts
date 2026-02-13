import { Schema } from "effect";
import { AudioFileId, ClipId, PatternId, ProjectId, TrackId } from "../ids";
import * as QN from "../lib/qn";
import * as Span from "../lib/span";

export const QNSpan = Span.Schema(QN.Schema);
export type QNSpan = Schema.Schema.Type<typeof QNSpan>;

export const ClipLoop = Schema.Struct({
  enabled: Schema.Boolean,
  length: QN.Schema,
});
export type ClipLoop = Schema.Schema.Type<typeof ClipLoop>;

export const MidiClipPayload = Schema.Struct({
  kind: Schema.Literal("midi"),
  patternId: PatternId,
});
export type MidiClipPayload = Schema.Schema.Type<typeof MidiClipPayload>;

export const AudioClipPayload = Schema.Struct({
  kind: Schema.Literal("audio"),
  audioFileId: AudioFileId,
  offsetSec: Schema.Number,
});
export type AudioClipPayload = Schema.Schema.Type<typeof AudioClipPayload>;

export const ClipPayload = Schema.Union(MidiClipPayload, AudioClipPayload);
export type ClipPayload = Schema.Schema.Type<typeof ClipPayload>;

export const Clip = Schema.Struct({
  id: ClipId,
  projectId: ProjectId,
  trackId: TrackId,
  span: QNSpan,
  loop: ClipLoop,
  sortOrder: Schema.Number,
  payload: ClipPayload,
});
export type Clip = Schema.Schema.Type<typeof Clip>;
