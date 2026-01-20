import { Schema } from "effect";
import { TrackId } from "../ids";
import { TimeSignature } from "../lib/time-signature";

export const ProjectCreate = Schema.Struct({
	t: Schema.Literal("project.create"),
	name: Schema.String,
	bpm: Schema.optional(Schema.Number),
	timeSignature: Schema.optional(TimeSignature),
});
export type ProjectCreate = typeof ProjectCreate.Type;

export const ProjectDelete = Schema.Struct({
	t: Schema.Literal("project.delete"),
});
export type ProjectDelete = typeof ProjectDelete.Type;

export const ProjectRename = Schema.Struct({
	t: Schema.Literal("project.rename"),
	name: Schema.String,
});
export type ProjectRename = typeof ProjectRename.Type;

export const ProjectSetTempo = Schema.Struct({
	t: Schema.Literal("project.setTempo"),
	bpm: Schema.Number,
});
export type ProjectSetTempo = typeof ProjectSetTempo.Type;

export const ProjectSetTimeSignature = Schema.Struct({
	t: Schema.Literal("project.setTimeSignature"),
	timeSignature: TimeSignature,
});
export type ProjectSetTimeSignature = typeof ProjectSetTimeSignature.Type;

export const ProjectReorderTracks = Schema.Struct({
	t: Schema.Literal("project.reorderTracks"),
	trackIds: Schema.Array(TrackId),
});
export type ProjectReorderTracks = typeof ProjectReorderTracks.Type;

export const ProjectOperation = Schema.Union(
	ProjectCreate,
	ProjectDelete,
	ProjectRename,
	ProjectSetTempo,
	ProjectSetTimeSignature,
	ProjectReorderTracks,
);
export type ProjectOperation = typeof ProjectOperation.Type;
