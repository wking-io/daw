import type { HttpClientError } from "@effect/platform/HttpClientError";
import * as Cause from "effect/Cause";
import { Effect, Schema } from "effect";
import * as ParseResult from "effect/ParseResult";
import { TreeFormatter, type ParseError } from "effect/ParseResult";
import { ulid } from "ulid";
import {
	type CreateInstrumentCommand,
	type CreateInstrumentResult,
	CreateInstrumentResult as CreateInstrumentResultSchema,
} from "@daw/contract";
import { DawIpcClient } from "./dawIpcClient";

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
	params: CreateInstrumentCommand,
): Effect.Effect<
	CreateInstrumentResult,
	HttpClientError | ParseError,
	DawIpcClient
> =>
	Effect.gen(function* () {
		const ipc = yield* DawIpcClient;
		const raw = yield* ipc.postCommand({
			requestId: ulid(),
			name: "daw.instrument.create",
			payload: params,
		});
		return yield* Schema.decodeUnknown(CreateInstrumentResultSchema)(raw);
	});

export const handleCreateInstrument = (
	params: CreateInstrumentCommand,
): Effect.Effect<CreateInstrumentResult, never, DawIpcClient> =>
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
				}) satisfies CreateInstrumentResult,
			);
		}),
	);

