import { Schema } from "effect";
import { Instrument } from "./instrument";
import { Pattern } from "./pattern";
import { Track } from "./track";

export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"));
export type ProjectId = typeof ProjectId.Type;

export const Project = Schema.Struct({
	id: ProjectId,
	name: Schema.String,
	instruments: Schema.Array(Instrument),
	tracks: Schema.Array(Track),
	patterns: Schema.Array(Pattern),
	createdAt: Schema.DateFromNumber,
});
export type Project = typeof Project.Type;
