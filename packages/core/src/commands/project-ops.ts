import { Schema } from "effect";
import { ProjectId, TrackId } from "../ids";
import { TimeSignature } from "../lib/time-signature";

export const ProjectCreate = Schema.Struct({
	t: Schema.Literal("project.create"),
	projectId: ProjectId,
	name: Schema.String,
	bpm: Schema.optional(Schema.Number),
	timeSignature: Schema.optional(TimeSignature),
});
export type ProjectCreate = Schema.Schema.Type<typeof ProjectCreate>;

export const ProjectDelete = Schema.Struct({
	t: Schema.Literal("project.delete"),
});
export type ProjectDelete = Schema.Schema.Type<typeof ProjectDelete>;

export const ProjectRename = Schema.Struct({
	t: Schema.Literal("project.rename"),
	name: Schema.String,
});
export type ProjectRename = Schema.Schema.Type<typeof ProjectRename>;

export const ProjectSetTempo = Schema.Struct({
	t: Schema.Literal("project.setTempo"),
	bpm: Schema.Number,
});
export type ProjectSetTempo = Schema.Schema.Type<typeof ProjectSetTempo>;

export const ProjectSetTimeSignature = Schema.Struct({
	t: Schema.Literal("project.setTimeSignature"),
	timeSignature: TimeSignature,
});
export type ProjectSetTimeSignature = Schema.Schema.Type<
	typeof ProjectSetTimeSignature
>;

export const ProjectReorderTracks = Schema.Struct({
	t: Schema.Literal("project.reorderTracks"),
	trackIds: Schema.Array(TrackId),
});
export type ProjectReorderTracks = Schema.Schema.Type<
	typeof ProjectReorderTracks
>;

export const ProjectOperation = Schema.Union(
	ProjectCreate,
	ProjectDelete,
	ProjectRename,
	ProjectSetTempo,
	ProjectSetTimeSignature,
	ProjectReorderTracks,
);
export type ProjectOperation = Schema.Schema.Type<typeof ProjectOperation>;
