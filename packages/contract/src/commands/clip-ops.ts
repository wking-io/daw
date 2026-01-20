import { Schema } from "effect";
import { QNSpan } from "../domain/clip";
import { AudioFileId, ClipId, PatternId, QN, TrackId } from "../ids";

export const ClipCreateMidi = Schema.Struct({
	t: Schema.Literal("clip.createMidi"),
	trackId: TrackId,
	span: QNSpan,
	patternId: Schema.optional(PatternId), // clone from existing pattern
});
export type ClipCreateMidi = typeof ClipCreateMidi.Type;

export const ClipCreateAudio = Schema.Struct({
	t: Schema.Literal("clip.createAudio"),
	trackId: TrackId,
	span: QNSpan,
	audioFileId: AudioFileId,
	offsetSec: Schema.optional(Schema.Number),
});
export type ClipCreateAudio = typeof ClipCreateAudio.Type;

export const ClipDelete = Schema.Struct({
	t: Schema.Literal("clip.delete"),
	clipId: ClipId,
});
export type ClipDelete = typeof ClipDelete.Type;

export const ClipMove = Schema.Struct({
	t: Schema.Literal("clip.move"),
	clipId: ClipId,
	startQN: QN,
	trackId: Schema.optional(TrackId),
});
export type ClipMove = typeof ClipMove.Type;

export const ClipResize = Schema.Struct({
	t: Schema.Literal("clip.resize"),
	clipId: ClipId,
	span: QNSpan,
});
export type ClipResize = typeof ClipResize.Type;

export const ClipSetLoop = Schema.Struct({
	t: Schema.Literal("clip.setLoop"),
	clipId: ClipId,
	enabled: Schema.Boolean,
	length: Schema.optional(QN),
});
export type ClipSetLoop = typeof ClipSetLoop.Type;

export const ClipOperation = Schema.Union(
	ClipCreateMidi,
	ClipCreateAudio,
	ClipDelete,
	ClipMove,
	ClipResize,
	ClipSetLoop,
);
export type ClipOperation = typeof ClipOperation.Type;
