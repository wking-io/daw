import { Schema } from "effect";
import { AudioFileId, ProjectId } from "../ids";
import * as Sec from "../lib/sec";

export const AudioFile = Schema.Struct({
  id: AudioFileId,
  projectId: ProjectId,
  name: Schema.String,
  originalPath: Schema.String,
  storedPath: Schema.String,
  duration: Sec.Schema,
  sampleRate: Schema.Number,
  channels: Schema.Number.pipe(Schema.int(), Schema.between(1, 8)),
});
export type AudioFile = Schema.Schema.Type<typeof AudioFile>;
