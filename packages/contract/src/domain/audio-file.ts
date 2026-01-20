import { Schema } from "effect";
import { AudioFileId, ProjectId } from "../ids";

export const AudioFile = Schema.Struct({
	id: AudioFileId,
	projectId: ProjectId,
	name: Schema.String,
	originalPath: Schema.String,
	storedPath: Schema.String,
	durationSec: Schema.Number,
	sampleRate: Schema.Number,
	channels: Schema.Number.pipe(Schema.int(), Schema.between(1, 8)),
});
export type AudioFile = typeof AudioFile.Type;
