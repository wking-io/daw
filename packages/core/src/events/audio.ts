import { Schema } from "effect";
import { AudioFile } from "../domain/audio-file";
import * as Ids from "../ids";

export const AudioFileRegistered = Schema.Struct({
	t: Schema.Literal("audioFile.registered"),
	audioFile: AudioFile,
});
export type AudioFileRegistered = Schema.Schema.Type<
	typeof AudioFileRegistered
>;

export const AudioFileUnregistered = Schema.Struct({
	t: Schema.Literal("audioFile.unregistered"),
	audioFileId: Ids.AudioFileId,
});
export type AudioFileUnregistered = Schema.Schema.Type<
	typeof AudioFileUnregistered
>;

export const AudioFileRenamed = Schema.Struct({
	t: Schema.Literal("audioFile.renamed"),
	audioFileId: Ids.AudioFileId,
	name: Schema.String,
});
export type AudioFileRenamed = Schema.Schema.Type<typeof AudioFileRenamed>;

export const AudioFileEvent = Schema.Union(
	AudioFileRegistered,
	AudioFileUnregistered,
	AudioFileRenamed,
);
export type AudioFileEvent = Schema.Schema.Type<typeof AudioFileEvent>;
