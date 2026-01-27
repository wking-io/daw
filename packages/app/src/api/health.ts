import { Atom } from "@daw/atom-remix";
import { Effect, Schedule } from "effect";
import { ApiClient } from "./client";

const MAX_RETRIES = 20;
const RETRY_DELAY = 500;

export const healthWithRetryAtom = Atom.setIdleTTL(
	ApiClient.runtime.atom(
		Effect.gen(function* () {
			const client = yield* ApiClient;
			return yield* client.health.health({}).pipe(
				Effect.flatMap((response) =>
					response.healthy
						? Effect.succeed(response)
						: Effect.fail(new Error("Server not healthy")),
				),
				Effect.retry(
					Schedule.intersect(
						Schedule.recurs(MAX_RETRIES),
						Schedule.spaced(RETRY_DELAY),
					),
				),
			);
		}),
	),
	2000,
);
