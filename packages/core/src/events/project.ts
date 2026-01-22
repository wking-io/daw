import { Schema } from "effect";
import * as Domain from "../domain";
import * as Ids from "../ids";
import { TimeSignature } from "../lib/time-signature";
import { ProjectVersion } from "../versions";

export const ProjectSubscribedEvent = Schema.Struct({
	t: Schema.Literal("project.subscribed"),
	version: ProjectVersion,
	timestamp: Schema.Number,
});
export type ProjectSubscribedEvent = typeof ProjectSubscribedEvent.Type;

// Project events
export const ProjectCreated = Schema.Struct({
	t: Schema.Literal("project.created"),
	project: Domain.Project,
});
export type ProjectCreated = typeof ProjectCreated.Type;

export const ProjectDeleted = Schema.Struct({
	t: Schema.Literal("project.deleted"),
	projectId: Ids.ProjectId,
});
export type ProjectDeleted = typeof ProjectDeleted.Type;

export const ProjectRenamed = Schema.Struct({
	t: Schema.Literal("project.renamed"),
	name: Schema.String,
});
export type ProjectRenamed = typeof ProjectRenamed.Type;

export const ProjectTempoChanged = Schema.Struct({
	t: Schema.Literal("project.tempoChanged"),
	bpm: Schema.Number,
});
export type ProjectTempoChanged = typeof ProjectTempoChanged.Type;

export const ProjectTimeSignatureChanged = Schema.Struct({
	t: Schema.Literal("project.timeSignatureChanged"),
	timeSignature: TimeSignature,
});
export type ProjectTimeSignatureChanged =
	typeof ProjectTimeSignatureChanged.Type;

export const ProjectTracksReordered = Schema.Struct({
	t: Schema.Literal("project.tracksReordered"),
	trackIds: Schema.Array(Ids.TrackId),
});
export type ProjectTracksReordered = typeof ProjectTracksReordered.Type;

export const ProjectEvent = Schema.Union(
	ProjectCreated,
	ProjectDeleted,
	ProjectRenamed,
	ProjectTempoChanged,
	ProjectTimeSignatureChanged,
	ProjectTracksReordered,
);
export type ProjectEvent = typeof ProjectEvent.Type;
