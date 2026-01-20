import { Schema } from "effect";
import { AudioFileId, ClipId, PatternId, ProjectId, QN, TrackId } from "../ids";

export const QNSpan = Schema.Struct({
	start: QN,
	size: QN,
});
export type QNSpan = typeof QNSpan.Type;

export const ClipLoop = Schema.Struct({
	enabled: Schema.Boolean,
	length: QN,
});
export type ClipLoop = typeof ClipLoop.Type;

export const MidiClipPayload = Schema.Struct({
	kind: Schema.Literal("midi"),
	patternId: PatternId,
});
export type MidiClipPayload = typeof MidiClipPayload.Type;

export const AudioClipPayload = Schema.Struct({
	kind: Schema.Literal("audio"),
	audioFileId: AudioFileId,
	offsetSec: Schema.Number,
});
export type AudioClipPayload = typeof AudioClipPayload.Type;

export const ClipPayload = Schema.Union(MidiClipPayload, AudioClipPayload);
export type ClipPayload = typeof ClipPayload.Type;

export const Clip = Schema.Struct({
	id: ClipId,
	projectId: ProjectId,
	trackId: TrackId,
	span: QNSpan,
	loop: ClipLoop,
	sortOrder: Schema.Number,
	payload: ClipPayload,
});
export type Clip = typeof Clip.Type;
