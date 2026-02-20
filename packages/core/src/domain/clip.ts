import { Schema } from "effect";
import { AudioFileId, ClipId, PatternId, ProjectId, TrackId, generate } from "../ids";
import type { EditorEvent } from "../events/editor";
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

/**
 * Resolve the overlap between a single existing `clip` and a `placed` span.
 * Returns events to apply: delete, resize, or resize + create (split).
 */
export function resolveOverlap(clip: Clip, placed: Span.Span<QN.QN>): EditorEvent[] {
  const remainders = Span.subtract(QN.Numeric, clip.span, placed);

  if (remainders.length === 0) {
    return [{ t: "clip.deleted", clipId: clip.id }];
  }

  if (remainders.length === 1) {
    return [{ t: "clip.resized", clipId: clip.id, span: remainders[0]! }];
  }

  return [
    { t: "clip.resized", clipId: clip.id, span: remainders[0]! },
    {
      t: "clip.created",
      clip: { ...clip, id: generate("ClipId"), span: remainders[1]! },
    },
  ];
}
