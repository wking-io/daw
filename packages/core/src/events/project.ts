import { Schema } from "effect";
import { Project } from "../domain/project";
import * as Ids from "../ids";
import { TimeSignature } from "../lib/time-signature";
import { ProjectVersion } from "../versions";

export const ProjectSubscribedEvent = Schema.Struct({
	t: Schema.Literal("project.subscribed"),
	version: ProjectVersion,
	timestamp: Schema.Number,
});
export type ProjectSubscribedEvent = Schema.Schema.Type<
	typeof ProjectSubscribedEvent
>;

// Project events
export const ProjectCreated = Schema.Struct({
	t: Schema.Literal("project.created"),
	project: Project,
});
export type ProjectCreated = Schema.Schema.Type<typeof ProjectCreated>;

export const ProjectDeleted = Schema.Struct({
	t: Schema.Literal("project.deleted"),
	projectId: Ids.ProjectId,
	deletedAt: Schema.DateTimeUtc,
});
export type ProjectDeleted = Schema.Schema.Type<typeof ProjectDeleted>;

export const ProjectRenamed = Schema.Struct({
	t: Schema.Literal("project.renamed"),
	name: Schema.String,
});
export type ProjectRenamed = Schema.Schema.Type<typeof ProjectRenamed>;

export const ProjectTempoChanged = Schema.Struct({
	t: Schema.Literal("project.tempoChanged"),
	bpm: Schema.Number,
});
export type ProjectTempoChanged = Schema.Schema.Type<
	typeof ProjectTempoChanged
>;

export const ProjectTimeSignatureChanged = Schema.Struct({
	t: Schema.Literal("project.timeSignatureChanged"),
	timeSignature: TimeSignature,
});
export type ProjectTimeSignatureChanged = Schema.Schema.Type<
	typeof ProjectTimeSignatureChanged
>;

export const ProjectTracksReordered = Schema.Struct({
	t: Schema.Literal("project.tracksReordered"),
	trackIds: Schema.Array(Ids.TrackId),
});
export type ProjectTracksReordered = Schema.Schema.Type<
	typeof ProjectTracksReordered
>;

export const ProjectEvent = Schema.Union(
	ProjectCreated,
	ProjectDeleted,
	ProjectRenamed,
	ProjectTempoChanged,
	ProjectTimeSignatureChanged,
	ProjectTracksReordered,
);
export type ProjectEvent = Schema.Schema.Type<typeof ProjectEvent>;
