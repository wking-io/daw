import { Schema } from "effect";
import { AudioFileId, ClipId, PatternId, ProjectId, TrackId, generate } from "../ids";
import type { EditorEvent } from "../events/editor";
import * as N from "../lib/numeric";
import * as QN from "../lib/qn";
import * as Sec from "../lib/sec";
import * as Span from "../lib/span";

export const QNSpan = Span.Schema(QN.Schema);
export type QNSpan = Schema.Schema.Type<typeof QNSpan>;

export const MidiClipPayload = Schema.Struct({
  kind: Schema.Literal("midi"),
  patternId: PatternId,
  length: QN.Schema,
});
export type MidiClipPayload = Schema.Schema.Type<typeof MidiClipPayload>;

export const MidiLoopPayload = Schema.Struct({
  kind: Schema.Literal("midi-loop"),
  patternId: PatternId,
  length: QN.Schema,
  loop: QNSpan,
});
export type MidiLoopPayload = Schema.Schema.Type<typeof MidiLoopPayload>;

export const AudioClipPayload = Schema.Struct({
  kind: Schema.Literal("audio"),
  audioFileId: AudioFileId,
  offset: Sec.Schema,
  length: QN.Schema,
});
export type AudioClipPayload = Schema.Schema.Type<typeof AudioClipPayload>;

export const AudioLoopPayload = Schema.Struct({
  kind: Schema.Literal("audio-loop"),
  audioFileId: AudioFileId,
  offset: Sec.Schema,
  length: QN.Schema,
  loop: QNSpan,
});
export type AudioLoopPayload = Schema.Schema.Type<typeof AudioLoopPayload>;

export const ClipPayload = Schema.Union(
  MidiClipPayload,
  MidiLoopPayload,
  AudioClipPayload,
  AudioLoopPayload,
);
export type ClipPayload = Schema.Schema.Type<typeof ClipPayload>;

export function isMidiPayload(p: ClipPayload): p is MidiClipPayload | MidiLoopPayload {
  return p.kind === "midi" || p.kind === "midi-loop";
}

export function isAudioPayload(p: ClipPayload): p is AudioClipPayload | AudioLoopPayload {
  return p.kind === "audio" || p.kind === "audio-loop";
}

export function payloadFamily(p: ClipPayload): "midi" | "audio" {
  return p.kind === "midi" || p.kind === "midi-loop" ? "midi" : "audio";
}

export const Clip = Schema.Struct({
  id: ClipId,
  projectId: ProjectId,
  trackId: TrackId,
  span: QNSpan,
  sortOrder: Schema.Number,
  payload: ClipPayload,
  offset: QN.Schema,
});
export type Clip = Schema.Schema.Type<typeof Clip>;

/**
 * Resolve the overlap between a single existing `clip` and a `placed` span.
 * Returns events to apply: delete, resize, or resize + create (split).
 */
export function resolveOverlap(clip: Clip, placed: Span.Span<QN.QN>): EditorEvent[] {
  const [left, right] = Span.subtract(clip.span, placed);

  if (!left) {
    return [{ t: "clip.deleted", clipId: clip.id }];
  }

  if (!right) {
    return [{ t: "clip.resized", clipId: clip.id, span: left }];
  }

  // Right remainder starts later → content offset increases by the gap
  const rightOffset = N.add(clip.offset, N.subtract(right.start, clip.span.start));
  return [
    { t: "clip.resized", clipId: clip.id, span: left },
    {
      t: "clip.created",
      clip: { ...clip, id: generate("ClipId"), span: right, offset: rightOffset },
    },
  ];
}
