import { Schema } from "effect";
import { ProjectId } from "../ids";
import { TimeSignature } from "../lib/time-signature";

export const Project = Schema.Struct({
	id: ProjectId,
	name: Schema.String,
	createdAt: Schema.DateFromNumber,
	updatedAt: Schema.DateFromNumber,
	bpm: Schema.Number.pipe(Schema.between(20, 999)),
	timeSignature: TimeSignature,
});
export type Project = typeof Project.Type;

export const ProjectVersion = Schema.Number;
export type ProjectVersion = typeof ProjectVersion.Type;
