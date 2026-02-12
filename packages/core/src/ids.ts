import { Schema } from "effect";
import { ulid } from "ulid";

// Re-export QN schema for use in Schema.Struct definitions
export { QNSchema as QN } from "./lib/qn";

export type ValidId =
  | "ProjectId"
  | "TrackId"
  | "ClipId"
  | "PatternId"
  | "NoteId"
  | "AutomationLaneId"
  | "AutomationPointId"
  | "AudioFileId"
  | "DeviceId"
  | "CommandId";

export const Id = <B extends ValidId>(brand: B) => Schema.String.pipe(Schema.brand(brand));
export type IdOf<B extends ValidId> = Schema.Schema.Type<ReturnType<typeof Id<B>>>;

export const generate = <B extends ValidId>(brand: B) => {
  return Schema.decodeUnknownSync(Id(brand))(ulid());
};

// Entity IDs (ULIDs)
export const ProjectId = Id("ProjectId");
export type ProjectId = Schema.Schema.Type<typeof ProjectId>;

export const TrackId = Id("TrackId");
export type TrackId = Schema.Schema.Type<typeof TrackId.Type>;

export const ClipId = Id("ClipId");
export type ClipId = Schema.Schema.Type<typeof ClipId>;

export const PatternId = Id("PatternId");
export type PatternId = Schema.Schema.Type<typeof PatternId>;

export const NoteId = Id("NoteId");
export type NoteId = Schema.Schema.Type<typeof NoteId>;

export const AutomationLaneId = Id("AutomationLaneId");
export type AutomationLaneId = Schema.Schema.Type<typeof AutomationLaneId>;

export const AutomationPointId = Id("AutomationPointId");
export type AutomationPointId = Schema.Schema.Type<typeof AutomationPointId>;

export const AudioFileId = Id("AudioFileId");
export type AudioFileId = Schema.Schema.Type<typeof AudioFileId>;

export const DeviceId = Id("DeviceId");
export type DeviceId = Schema.Schema.Type<typeof DeviceId>;

export const CommandId = Id("CommandId");
export type CommandId = Schema.Schema.Type<typeof CommandId>;
