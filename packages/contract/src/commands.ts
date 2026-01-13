import { Schema } from "effect";
import { Instrument, InstrumentType } from "./instrument";

export const CreateInstrumentCommand = Schema.Struct({
	type: InstrumentType,
	name: Schema.String,
	preset: Schema.optional(Schema.String),
});
export type CreateInstrumentCommand = typeof CreateInstrumentCommand.Type;

/**
 * Result payload returned by the host/UI when handling `daw.instrument.create`.
 *
 * This is intentionally JSON-serializable and stable across IPC/MCP boundaries.
 */
export const CreateInstrumentResult = Schema.Union(
	Schema.Struct({
		ok: Schema.Literal(true),
		instrument: Instrument,
	}),
	Schema.Struct({
		ok: Schema.Literal(false),
		error: Schema.String,
	}),
);
export type CreateInstrumentResult = typeof CreateInstrumentResult.Type;

export const CreateInstrumentTool = {
	name: "daw.instrument.create",
	description: "Create a new instrument in the DAW",
	inputSchema: CreateInstrumentCommand,
} as const;

/**
 * Exported MCP-facing tool registry.
 * The MCP server sidecar imports this to advertise supported tools.
 */
export const DawTools = [CreateInstrumentTool] as const;
