import type { Instrument } from "@daw/contract";
import { InstrumentCommands, InstrumentTools } from "@daw/contract";
import * as Registry from "@effect-atom/atom/Registry";
import { Effect, Schema } from "effect";
import { ulid } from "ulid";
import { instrumentsAtom } from "./atoms";

export interface DawToolCallOptions {
	readonly host?: string;
	readonly port?: number;
}

export const executeCreateInstrument = (
	cmd: InstrumentCommands.CreateCommand,
): Effect.Effect<Instrument.Instrument, never, Registry.AtomRegistry> =>
	Effect.gen(function* () {
		const registry = yield* Registry.AtomRegistry;
		const instrument: Instrument.Instrument = {
			id: ulid() as Instrument.InstrumentId,
			type: cmd.type,
			name: cmd.name,
			params: {},
			createdAt: new Date(),
		};
		registry.update(
			instrumentsAtom,
			(prev: ReadonlyArray<Instrument.Instrument>) => [...prev, instrument],
		);
		return instrument;
	});

export const encodeCreateInstrumentResultJson = (
	result: InstrumentCommands.CreateResult,
): string =>
	JSON.stringify(Schema.encodeSync(InstrumentCommands.CreateResult)(result));

/**
 * Initiate a "tool call" through the desktop IPC HTTP bridge.
 *
 * This uses the same transport as MCP (`POST /command`), which will relay the
 * command to the UI via `platform.onCommand(...)` and wait for `platform.respond(...)`.
 */
export const callCreateInstrumentTool = (
	cmd: InstrumentCommands.CreateCommand,
	options?: DawToolCallOptions,
): Effect.Effect<InstrumentCommands.CreateResult, Error> => {
	const host = options?.host ?? "127.0.0.1";
	const port = options?.port ?? 43123;
	const url = `http://${host}:${port}/command`;

	return Effect.tryPromise({
		try: async () => {
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					requestId: ulid(),
					name: InstrumentTools.CreateName,
					payload: cmd,
				}),
			});

			const text = await res.text();
			if (!res.ok) {
				throw new Error(
					text.length > 0 ? text : `HTTP ${res.status} ${res.statusText}`,
				);
			}

			let raw: unknown;
			try {
				raw = JSON.parse(text) as unknown;
			} catch {
				throw new Error(
					text.length > 0 ? text : "Non-JSON response from /command",
				);
			}

			return raw;
		},
		catch: (cause) =>
			cause instanceof Error
				? cause
				: new Error(`Tool call failed: ${String(cause)}`),
	}).pipe(
		Effect.flatMap(Schema.decodeUnknown(InstrumentCommands.CreateResult)),
	);
};
