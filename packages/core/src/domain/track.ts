import { Schema } from "effect";
import { DeviceId, ProjectId, TrackId } from "../ids";

export const TrackType = Schema.Literal("audio", "midi", "bus");
export type TrackType = Schema.Schema.Type<typeof TrackType>;

export const TrackColor = Schema.Literal(
  "plum",
  "strawberry",
  "ruby",
  "tangerine",
  "ochre",
  "honey",
  "lemon",
  "pear",
  "pistachio",
  "jade",
  "emerald",
  "aqua",
  "ocean",
  "sky",
  "cobalt",
  "denim",
  "iris",
  "grape",
  "lilac",
  "fuchsia",
  "blush",
);
export type TrackColor = Schema.Schema.Type<typeof TrackColor>;

export const Track = Schema.Struct({
  id: TrackId,
  projectId: ProjectId,
  type: TrackType,
  name: Schema.String,
  color: TrackColor,
  volumeDb: Schema.Number,
  pan: Schema.Number.pipe(Schema.between(-1, 1)),
  mute: Schema.Boolean,
  solo: Schema.Boolean,
  compact: Schema.Boolean,
  heightMultiplier: Schema.Number.pipe(Schema.between(1, 24)),
  sortOrder: Schema.Number,
  deviceIds: Schema.Array(DeviceId), // stubbed for now
});
export type Track = Schema.Schema.Type<typeof Track>;
