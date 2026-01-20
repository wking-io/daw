import type { Commands, Events } from "@daw/contract";
import type { HttpApiError } from "@effect/platform";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Context, Data, Effect, Layer } from "effect";
import type { ParseError } from "effect/ParseResult";
import { ApiClient } from "../client";

export class OperationFailedError extends Data.TaggedError(
	"OperationFailedError",
)<{
	readonly message: string;
}> {}

export type DawRepositoryError =
	| HttpClientError
	| ParseError
	| HttpApiError.Unauthorized
	| HttpApiError.HttpApiDecodeError
	| HttpApiError.NotFound
	| OperationFailedError;

// Stubbed repository interface for DAW operations
export class DawRepository extends Context.Tag("mcp/DawRepository")<
	DawRepository,
	{
		readonly executeCommand: (
			projectId: string,
			command: Commands.Command,
		) => Effect.Effect<Events.CommandResult, DawRepositoryError>;
		/** @deprecated Use executeCommand instead */
		readonly submitOperation: (
			projectId: string,
			command: Commands.Command,
		) => Effect.Effect<Events.CommandResult, DawRepositoryError>;
	}
>() {}

export const DawRepositoryLive = Layer.effect(
	DawRepository,
	Effect.gen(function* () {
		const client = yield* ApiClient;

		const executeCommand = (projectId: string, command: Commands.Command) =>
			Effect.gen(function* () {
				const result = yield* client.project.executeCommand({
					path: { projectId: projectId as any },
					payload: command,
				});
				return result;
			});

		return {
			executeCommand,
			submitOperation: executeCommand,
		};
	}),
).pipe(Layer.provide(ApiClient.Default));

// Keep old exports for backwards compatibility during transition
export { DawRepository as InstrumentRepository };
export { DawRepositoryLive as InstrumentRepositoryLive };
export type { DawRepositoryError as InstrumentRepositoryError };
