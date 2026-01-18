import { InstrumentCommands } from "@daw/contract";
import { Effect } from "effect";
import * as Cause from "effect/Cause";
import * as ParseResult from "effect/ParseResult";
import { TreeFormatter } from "effect/ParseResult";
import { InstrumentRepository, type InstrumentRepositoryError } from "./repo";

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
	InstrumentRepositoryError,
	InstrumentRepository
> =>
	Effect.gen(function* () {
		const repo = yield* InstrumentRepository;
		const instrument = yield* repo.create(params);
		return InstrumentCommands.CreateResultSuccess.make({
			ok: true,
			instrument,
		});
	});

export const handleCreateInstrument = (
	params: InstrumentCommands.CreateCommand,
): Effect.Effect<
	InstrumentCommands.CreateResult,
	never,
	InstrumentRepository
> =>
	createInstrumentEffect(params).pipe(
		Effect.catchAllCause((cause) => {
			// Don't turn cancellation into a "business error"
			if (Cause.isInterruptedOnly(cause)) {
				return Effect.interrupt;
			}
			return Effect.succeed(
				InstrumentCommands.CreateResultError.make({
					ok: false,
					error: formatCreateInstrumentError(cause),
				}),
			);
		}),
	);
