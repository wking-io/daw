import { Schema } from "effect";
export declare const CreateInstrumentCommand: Schema.Struct<{
	type: Schema.Literal<["synth", "sampler", "drum"]>;
	name: typeof Schema.String;
	preset: Schema.optional<typeof Schema.String>;
}>;
export type CreateInstrumentCommand = typeof CreateInstrumentCommand.Type;
export declare const CreateInstrumentTool: {
	readonly name: "daw.instrument.create";
	readonly description: "Create a new instrument in the DAW";
	readonly inputSchema: Schema.Struct<{
		type: Schema.Literal<["synth", "sampler", "drum"]>;
		name: typeof Schema.String;
		preset: Schema.optional<typeof Schema.String>;
	}>;
};
