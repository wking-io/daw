import type { Instrument, InstrumentCommands, Project } from "@daw/contract";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Effect } from "effect";
import * as Cause from "effect/Cause";
import * as ParseResult from "effect/ParseResult";
import { type ParseError, TreeFormatter } from "effect/ParseResult";
import { ulid } from "ulid";
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
	HttpClientError | ParseError | Error,
	DawStateClient
> =>
	Effect.gen(function* () {
		// #region agent log
		fetch("http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "packages/mcp/src/handlers.ts:createInstrumentEffect",
				message: "mcp.createInstrumentEffect.entry",
				data: {
					type: params.type,
					name: params.name,
					hasPreset: !!params.preset,
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "pre-fix",
				hypothesisId: "H1",
			}),
		}).catch(() => {});
		// #endregion agent log
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
				instrumentId: ulid() as Instrument.InstrumentId,
				createdAt: Date.now(),
			},
		};
		const result = yield* client.submitOp(submit);
		// #region agent log
		fetch("http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "packages/mcp/src/handlers.ts:createInstrumentEffect",
				message: "mcp.createInstrumentEffect.submitResult",
				data: {
					version: result.version,
					patchCount: result.patches.patches.length,
					audioDeltaCount: result.audioDeltas.deltas.length,
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "pre-fix",
				hypothesisId: "H2",
			}),
		}).catch(() => {});
		// #endregion agent log
		const created = result.patches.patches.find(
			(patch) => patch.t === "instrument.add",
		);
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
			return Effect.succeed({
				ok: false,
				error: formatCreateInstrumentError(cause),
			} satisfies InstrumentCommands.CreateResult);
		}),
	);
