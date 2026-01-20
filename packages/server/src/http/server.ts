import {
	Api,
	Authorization,
	Events,
	HealthResponse,
	Project,
} from "@daw/contract";
import {
	HttpApiBuilder,
	HttpApiError,
	HttpServerResponse,
} from "@effect/platform";
import {
	Duration,
	Effect,
	Equivalence,
	Layer,
	Option,
	Redacted,
	Stream,
} from "effect";
import { ServerConfig } from "../config";
import { DawStore } from "../store/store";
import { formatSSE } from "../utils/sse";

const HEARTBEAT_INTERVAL_MS = 30000;

const healthGroupLive = HttpApiBuilder.group(Api, "health", (handlers) =>
	handlers.handle("health", () =>
		Effect.gen(function* () {
			const config = yield* ServerConfig;
			return HealthResponse.make({ healthy: true, version: config.version });
		}),
	),
);

const AuthorizationLive = Layer.effect(
	Authorization,
	Effect.gen(function* () {
		const config = yield* ServerConfig;

		return {
			token: (token) => {
				const isValid = Redacted.getEquivalence(Equivalence.string);
				if (!isValid(token, Redacted.make(config.authToken))) {
					return Effect.fail(new HttpApiError.Unauthorized());
				}
				return Effect.void;
			},
		};
	}),
);

const projectGroupLive = HttpApiBuilder.group(Api, "project", (handlers) =>
	handlers
		.handle("getSnapshot", () =>
			Effect.gen(function* () {
				const store = yield* DawStore;
				const snapshot = yield* store.getSnapshot;
				return Project.Snapshot.make(snapshot);
			}),
		)
		.handle("getOperations", ({ urlParams }) =>
			Effect.gen(function* () {
				const store = yield* DawStore;
				const fromVersion = Option.fromNullable(urlParams.fromVersion).pipe(
					Option.getOrElse(() => 0),
				);
				const operations = yield* store.getOpsAfter(fromVersion);
				return Project.OperationsResponse.make({ fromVersion, operations });
			}),
		)
		.handle("postOperations", ({ payload }) =>
			Effect.gen(function* () {
				const store = yield* DawStore;
				const result = yield* store.submitOp(payload);
				return Project.SubmitResult.make(result);
			}),
		),
).pipe(Layer.provide(AuthorizationLive));

const eventsGroupLive = HttpApiBuilder.group(Api, "events", (handlers) =>
	handlers.handle("events", ({ urlParams }) =>
		Effect.gen(function* () {
			const store = yield* DawStore;
			const snapshot = yield* store.getSnapshot;
			const fromVersion = Option.fromNullable(urlParams.fromVersion).pipe(
				Option.getOrElse(() => 0),
			);

			// Create connected event
			const connectedStream = Stream.make(
				Events.ServerConnectedEvent.make({
					t: "server.connected",
					serverVersion: snapshot.version,
				}),
			);

			// Create heartbeat stream (each emission is delayed by HEARTBEAT_INTERVAL_MS)
			const heartbeatStream = Stream.repeatEffect(
				Effect.delay(
					Effect.sync(() =>
						Events.ServerHeartbeatEvent.make({
							t: "server.heartbeat",
							timestamp: Date.now(),
						}),
					),
					Duration.millis(HEARTBEAT_INTERVAL_MS),
				),
			);

			// Get op stream and map to SSE events
			const opStream = yield* store.opStreamFrom(fromVersion);
			const opEventStream = opStream.pipe(
				Stream.map((entry) =>
					Events.OperationEvent.make({ t: "operation", entry }),
				),
			);

			// Get patch stream and map to SSE events
			const patchStream = yield* store.patchStreamFrom(fromVersion);
			const patchEventStream = patchStream.pipe(
				Stream.map((batch) => Events.PatchEvent.make({ t: "patch", batch })),
			);

			// Combine all event streams
			const combinedStream = Stream.merge(
				Stream.merge(opEventStream, patchEventStream),
				heartbeatStream,
			);

			// Prepend connected event and format as SSE
			const stream = Stream.concat(connectedStream, combinedStream).pipe(
				Stream.map((event) => new TextEncoder().encode(formatSSE(event))),
			);

			return HttpServerResponse.stream(stream, {
				contentType: "text/event-stream",
				headers: {
					"cache-control": "no-cache",
					connection: "keep-alive",
				},
			});
		}),
	),
).pipe(Layer.provide(AuthorizationLive));

export const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(healthGroupLive),
	Layer.provide(projectGroupLive),
	Layer.provide(eventsGroupLive),
);
