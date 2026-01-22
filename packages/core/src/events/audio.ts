import { Schema } from "effect";
import * as Domain from "../domain";
import * as Ids from "../ids";

export const AudioFileRegistered = Schema.Struct({
	t: Schema.Literal("audioFile.registered"),
	audioFile: Domain.AudioFile,
});
export type AudioFileRegistered = typeof AudioFileRegistered.Type;

export const AudioFileUnregistered = Schema.Struct({
	t: Schema.Literal("audioFile.unregistered"),
	audioFileId: Ids.AudioFileId,
});
export type AudioFileUnregistered = typeof AudioFileUnregistered.Type;

export const AudioFileRenamed = Schema.Struct({
	t: Schema.Literal("audioFile.renamed"),
	audioFileId: Ids.AudioFileId,
	name: Schema.String,
});
export type AudioFileRenamed = typeof AudioFileRenamed.Type;

export const AudioFileEvent = Schema.Union(
	AudioFileRegistered,
	AudioFileUnregistered,
	AudioFileRenamed,
);
export type AudioFileEvent = typeof AudioFileEvent.Type;
