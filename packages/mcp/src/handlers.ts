import type { HttpClientError } from "@effect/platform/HttpClientError";
import * as Cause from "effect/Cause";
import { Effect } from "effect";
import * as ParseResult from "effect/ParseResult";
import { TreeFormatter, type ParseError } from "effect/ParseResult";
import { ulid } from "ulid";
import { InstrumentCommands, Project } from "@daw/contract";
import { DawStateClient } from "./dawIpcClient";

const formatCreateInstrumentError = (cause: Cause.Cause<unknown>): string => {
	const error = Cause.squash(cause);
	if (ParseResult.isParseError(error)) {
		return TreeFormatter.formatErrorSync(error);
	}
	return error instanceof Error ? error.message : String(error);
};

/**
 * Internal, typed handler logic.
 *
 * Prefer keeping failures in the error channel until you hit a "boundary"
 * (tool/runtime/transport), then collapse them to an `ok:false` domain result.
 */
export const createInstrumentEffect = (
	params: InstrumentCommands.CreateCommand,
): Effect.Effect<
	InstrumentCommands.CreateResult,
	HttpClientError | ParseError,
	DawStateClient
> =>
	Effect.gen(function* () {
		const client = yield* DawStateClient;
		const snapshot = yield* client.getSnapshot();
		const submit: Project.Submit = {
			opId: ulid(),
			baseVersion: snapshot.version,
			actor: "agent",
			op: {
				t: "instrument.create",
				type: params.type,
				name: params.name,
				preset: params.preset,
			},
		};
		const result = yield* client.submitOp(submit);
		const created = result.patches.patches.find((patch) => patch.t === "instrument.add");
		if (!created) {
			return yield* Effect.fail(
				new Error("submitOp succeeded but no instrument.add patch returned"),
			);
		}
		return {
			ok: true,
			instrument: created.instrument,
		} satisfies InstrumentCommands.CreateResult;
	});

export const handleCreateInstrument = (
	params: InstrumentCommands.CreateCommand,
): Effect.Effect<InstrumentCommands.CreateResult, never, DawStateClient> =>
	createInstrumentEffect(params).pipe(
		Effect.catchAllCause((cause) => {
			// Don't turn cancellation into a "business error"
			if (Cause.isInterruptedOnly(cause)) {
				return Effect.interrupt;
			}
			return Effect.succeed(
				({
					ok: false,
					error: formatCreateInstrumentError(cause),
				}) satisfies InstrumentCommands.CreateResult,
			);
		}),
	);

