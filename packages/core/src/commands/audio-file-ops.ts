import { Schema } from "effect";
import { AudioFileId } from "../ids";

export const AudioFileRegister = Schema.Struct({
  t: Schema.Literal("audioFile.register"),
  audioFileId: AudioFileId,
  sourcePath: Schema.String,
  name: Schema.optional(Schema.String),
});
export type AudioFileRegister = Schema.Schema.Type<typeof AudioFileRegister>;

export const AudioFileUnregister = Schema.Struct({
  t: Schema.Literal("audioFile.unregister"),
  audioFileId: AudioFileId,
});
export type AudioFileUnregister = Schema.Schema.Type<typeof AudioFileUnregister>;

export const AudioFileRename = Schema.Struct({
  t: Schema.Literal("audioFile.rename"),
  audioFileId: AudioFileId,
  name: Schema.String,
});
export type AudioFileRename = Schema.Schema.Type<typeof AudioFileRename>;

export const AudioFileOperation = Schema.Union(
  AudioFileRegister,
  AudioFileUnregister,
  AudioFileRename,
);
export type AudioFileOperation = Schema.Schema.Type<typeof AudioFileOperation>;
