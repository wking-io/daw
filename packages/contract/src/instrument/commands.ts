
import { Schema } from "effect";
import { Instrument, InstrumentType } from "./domain";

export const CreateCommand = Schema.Struct({
	type: InstrumentType,
	name: Schema.String,
	preset: Schema.optional(Schema.String),
});
export type CreateCommand = typeof CreateCommand.Type;

/**
 * Result payload returned by the host/UI when handling `daw.instrument.create`.
 *
 * This is intentionally JSON-serializable and stable across IPC/MCP boundaries.
 */
export const CreateResult = Schema.Union(
	Schema.Struct({
		ok: Schema.Literal(true),
		instrument: Instrument,
	}),
	Schema.Struct({
		ok: Schema.Literal(false),
		error: Schema.String,
	}),
);
export type CreateResult = typeof CreateResult.Type;