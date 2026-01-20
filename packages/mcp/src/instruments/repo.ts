import type { Instrument, InstrumentCommands, Project } from "@daw/contract";
import type { HttpApiError } from "@effect/platform";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Context, Data, Effect, Layer } from "effect";
import type { ParseError } from "effect/ParseResult";
import { ulid } from "ulid";
import { ApiClient } from "../client";

export class InstrumentNotCreatedError extends Data.TaggedError(
	"InstrumentNotCreatedError",
)<{
	readonly message: string;
}> {}

export type InstrumentRepositoryError =
	| HttpClientError
	| ParseError
	| HttpApiError.Unauthorized
	| HttpApiError.HttpApiDecodeError
	| InstrumentNotCreatedError;

export class InstrumentRepository extends Context.Tag(
	"mcp/InstrumentRepository",
)<
	InstrumentRepository,
	{
		readonly create: (
			params: InstrumentCommands.CreateCommand,
		) => Effect.Effect<Instrument.Instrument, InstrumentRepositoryError>;
	}
>() {}

export const InstrumentRepositoryLive = Layer.effect(
	InstrumentRepository,
	Effect.gen(function* () {
		const client = yield* ApiClient;

		return {
			create: (params) =>
				Effect.gen(function* () {
					const snapshot = yield* client.project.getSnapshot();
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
					const result = yield* client.project.postOperations({
						payload: submit,
					});
					const created = result.patches.patches.find(
						(patch) => patch.t === "instrument.add",
					);
					if (!created) {
						return yield* new InstrumentNotCreatedError({
							message:
								"submitOp succeeded but no instrument.add patch returned",
						});
					}
					return created.instrument;
				}),
		};
	}),
).pipe(Layer.provide(ApiClient.Default));
