import {
	Api,
	Authorization,
	Commands,
	HealthResponse,
	SSE,
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
import { Store } from "../store/store";
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

/**
 * Projects list endpoints (listing/creating projects)
 * For now, this is stubbed to work with a single project
 */
const projectsGroupLive = HttpApiBuilder.group(Api, "projects", (handlers) =>
	handlers
		.handle("listProjects", () =>
			Effect.gen(function* () {
				const store = yield* Store;
				const projects = yield* store.listProjects();
				return projects;
			}),
		)
		.handle("createProject", ({ payload }) =>
			Effect.gen(function* () {
				// For now, just return an error - we don't support creating projects yet
				// In a real implementation, this would create a new project
				return yield* Effect.fail(new HttpApiError.Unauthorized());
			}),
		),
).pipe(Layer.provide(AuthorizationLive));

/**
 * Single project endpoints
 */
const projectGroupLive = HttpApiBuilder.group(Api, "project", (handlers) =>
	handlers
		.handle("getSnapshot", ({ path }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				const snapshot = yield* store.getSnapshot(path.projectId);
				return snapshot;
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new HttpApiError.BadRequest()),
					SqlError: () => Effect.fail(new HttpApiError.InternalServerError()),
				}),
			),
		)
		.handle("executeCommand", ({ path, payload }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				const result = yield* store.executeCommand(path.projectId, payload);
				return result;
			}).pipe(
				Effect.catchTags({
					NoSuchElementException: () =>
						Effect.fail(new HttpApiError.NotFound()),
					ParseError: () => Effect.fail(new HttpApiError.BadRequest()),
					SqlError: () => Effect.fail(new HttpApiError.InternalServerError()),
				}),
			),
		)
		.handle("getEvents", ({ path, urlParams }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				const fromVersion = Option.fromNullable(urlParams.fromVersion).pipe(
					Option.getOrElse(() => 0),
				);
				const events = yield* store.getEventsAfter(path.projectId, fromVersion);
				return events;
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new HttpApiError.BadRequest()),
					SqlError: () => Effect.fail(new HttpApiError.InternalServerError()),
				}),
			),
		)
		.handle("deleteProject", ({ path }) =>
			Effect.gen(function* () {
				// For now, we don't support deleting projects
				return yield* Effect.fail(new HttpApiError.NotFound());
			}),
		),
).pipe(Layer.provide(AuthorizationLive));

/**
 * SSE endpoint group - renamed from "events" to "sse"
 */
const sseGroupLive = HttpApiBuilder.group(Api, "sse", (handlers) =>
	handlers.handle("subscribe", ({ path, urlParams }) =>
		Effect.gen(function* () {
			const store = yield* Store;
			const projectId = path.projectId;
			const snapshot = yield* store.getSnapshot(projectId);
			const fromVersion = Option.fromNullable(urlParams.fromVersion).pipe(
				Option.getOrElse(() => 0),
			);

			// Create connected event
			const connectedStream = Stream.make(
				SSE.ServerConnectedEvent.make({
					t: "server.connected",
					serverVersion: snapshot.version,
				}),
			);

			// Create heartbeat stream (each emission is delayed by HEARTBEAT_INTERVAL_MS)
			const heartbeatStream = Stream.repeatEffect(
				Effect.delay(
					Effect.sync(() =>
						SSE.ServerHeartbeatEvent.make({
							t: "server.heartbeat",
							timestamp: Date.now(),
						}),
					),
					Duration.millis(HEARTBEAT_INTERVAL_MS),
				),
			);

			// Get event stream and map to SSE events
			const eventStream = yield* store.eventStreamFrom(projectId, fromVersion);
			const eventBatchStream = eventStream.pipe(
				Stream.map((batch) => SSE.EventBatchEvent.make({ t: "events", batch })),
			);

			// Combine all event streams
			const combinedStream = Stream.merge(eventBatchStream, heartbeatStream);

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
		}).pipe(
			Effect.catchAllCause((cause) =>
				Effect.fail(new HttpApiError.InternalServerError()),
			),
		),
	),
).pipe(Layer.provide(AuthorizationLive));

export const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(healthGroupLive),
	Layer.provide(projectsGroupLive),
	Layer.provide(projectGroupLive),
	Layer.provide(sseGroupLive),
);
