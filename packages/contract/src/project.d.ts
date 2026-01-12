import { Schema } from "effect";
export declare const ProjectId: Schema.brand<typeof Schema.String, "ProjectId">;
export type ProjectId = typeof ProjectId.Type;
export declare const Project: Schema.Struct<{
	id: Schema.brand<typeof Schema.String, "ProjectId">;
	name: typeof Schema.String;
	instruments: Schema.Array$<
		Schema.Struct<{
			id: Schema.brand<typeof Schema.String, "InstrumentId">;
			type: Schema.Literal<["synth", "sampler", "drum"]>;
			name: typeof Schema.String;
			params: Schema.Record$<typeof Schema.String, typeof Schema.Unknown>;
			createdAt: typeof Schema.DateFromNumber;
		}>
	>;
	tracks: Schema.Array$<
		Schema.Struct<{
			id: Schema.brand<typeof Schema.String, "TrackId">;
			name: typeof Schema.String;
			instrumentId: Schema.brand<typeof Schema.String, "InstrumentId">;
		}>
	>;
	patterns: Schema.Array$<
		Schema.Struct<{
			id: Schema.brand<typeof Schema.String, "PatternId">;
			trackId: Schema.brand<typeof Schema.String, "TrackId">;
			steps: Schema.Array$<
				Schema.Struct<{
					time: typeof Schema.Number;
					value: typeof Schema.Unknown;
				}>
			>;
		}>
	>;
	createdAt: typeof Schema.DateFromNumber;
}>;
export type Project = typeof Project.Type;
