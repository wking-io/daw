import { Schema } from "effect";
import { AudioFileId } from "../ids";

export const AudioFileRegister = Schema.Struct({
	t: Schema.Literal("audioFile.register"),
	sourcePath: Schema.String,
	name: Schema.optional(Schema.String),
});
export type AudioFileRegister = typeof AudioFileRegister.Type;

export const AudioFileUnregister = Schema.Struct({
	t: Schema.Literal("audioFile.unregister"),
	audioFileId: AudioFileId,
});
export type AudioFileUnregister = typeof AudioFileUnregister.Type;

export const AudioFileRename = Schema.Struct({
	t: Schema.Literal("audioFile.rename"),
	audioFileId: AudioFileId,
	name: Schema.String,
});
export type AudioFileRename = typeof AudioFileRename.Type;

export const AudioFileOperation = Schema.Union(
	AudioFileRegister,
	AudioFileUnregister,
	AudioFileRename,
);
export type AudioFileOperation = typeof AudioFileOperation.Type;
