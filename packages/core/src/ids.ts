import { Schema } from "effect";

export type ValidId =
	| "ProjectId"
	| "TrackId"
	| "ClipId"
	| "PatternId"
	| "NoteId"
	| "AutomationLaneId"
	| "AutomationPointId"
	| "AudioFileId"
	| "DeviceId";

export const Id = <B extends ValidId>(brand: B) =>
	Schema.String.pipe(Schema.brand(brand));
export type IdOf<B extends ValidId> = Schema.Schema.Type<typeof Id<B>>;

// Entity IDs (ULIDs)
export const ProjectId = Id("ProjectId");
export type ProjectId = typeof ProjectId.Type;

export const TrackId = Id("TrackId");
export type TrackId = typeof TrackId.Type;

export const ClipId = Id("ClipId");
export type ClipId = typeof ClipId.Type;

export const PatternId = Id("PatternId");
export type PatternId = typeof PatternId.Type;

export const NoteId = Id("NoteId");
export type NoteId = typeof NoteId.Type;

export const AutomationLaneId = Id("AutomationLaneId");
export type AutomationLaneId = typeof AutomationLaneId.Type;

export const AutomationPointId = Id("AutomationPointId");
export type AutomationPointId = typeof AutomationPointId.Type;

export const AudioFileId = Id("AudioFileId");
export type AudioFileId = typeof AudioFileId.Type;

export const DeviceId = Id("DeviceId");
export type DeviceId = typeof DeviceId.Type;
