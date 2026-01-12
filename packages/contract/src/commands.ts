import { Schema } from "effect";
import { InstrumentType } from "./instrument";

export const CreateInstrumentCommand = Schema.Struct({
	type: InstrumentType,
	name: Schema.String,
	preset: Schema.optional(Schema.String),
});
export type CreateInstrumentCommand = typeof CreateInstrumentCommand.Type;

export const CreateInstrumentTool = {
	name: "daw.instrument.create",
	description: "Create a new instrument in the DAW",
	inputSchema: CreateInstrumentCommand,
} as const;
