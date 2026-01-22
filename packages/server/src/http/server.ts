import {
	Api,
	ApiError,
	Authorization,
	Events,
	HealthResponse,
} from "@daw/core";
import {
	HttpApiBuilder,
	HttpApiMiddleware,
	HttpApp,
	HttpServerRequest,
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
import { formatEventStream } from "../utils/format-event-stream";

// Extend the HttpApiMiddleware.Tag class to define the logger middleware tag
class RequestId extends HttpApiMiddleware.Tag<RequestId>()(
	"server/RequestId",
	{},
) {}

export const RequestIdMiddleware = Layer.effect(
	RequestId,
	Effect.gen(function* () {
		return Effect.gen(function* () {
			const request = yield* HttpServerRequest.HttpServerRequest;
			const requestId = request.headers["x-request-id"] ?? crypto.randomUUID();

			// Add pre-response handler to set the x-request-id header on the response
			yield* HttpApp.appendPreResponseHandler((_req, response) =>
				Effect.succeed(
					HttpServerResponse.setHeader(response, "x-request-id", requestId),
				),
			);
		});
	}),
);

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
					return Effect.fail(new ApiError.Unauthorized());
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
const projectGroupLive = HttpApiBuilder.group(Api, "project", (handlers) =>
	handlers
		.handle("list", () =>
			Effect.gen(function* () {
				const store = yield* Store;
				return yield* store.listProjects();
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new ApiError.BadRequest()),
					SqlError: () => Effect.fail(new ApiError.InternalServerError()),
				}),
			),
		)
		.handle("create", ({ payload }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				return yield* store.createProject(payload);
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new ApiError.BadRequest()),
					SqlError: () => Effect.fail(new ApiError.InternalServerError()),
				}),
			),
		)
		.handle("get", ({ path }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				return yield* store.getSnapshot(path.projectId);
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new ApiError.BadRequest()),
					SqlError: () => Effect.fail(new ApiError.InternalServerError()),
				}),
			),
		)
		.handle("edit", ({ path, payload }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				const result = yield* store.executeCommand(path.projectId, payload);
				return result;
			}).pipe(
				Effect.catchTags({
					NoSuchElementException: () => Effect.fail(new ApiError.NotFound()),
					ParseError: () => Effect.fail(new ApiError.BadRequest()),
					SqlError: () => Effect.fail(new ApiError.InternalServerError()),
				}),
			),
		)
		.handle("subscribe", ({ path, urlParams }) =>
			Effect.gen(function* () {
				const store = yield* Store;
				const projectId = path.projectId;
				const snapshot = yield* store.getSnapshot(projectId);
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

				// Get event stream and wrap batches in event envelope
				const eventStream = yield* store.eventStreamFrom(
					projectId,
					fromVersion,
				);
				const eventBatchStream = eventStream.pipe(
					Stream.map((batch) =>
						Events.Batch.make({
							t: "events",
							batch: {
								version: batch.version,
								events: batch.events,
							},
						}),
					),
				);

				// Combine all event streams
				const combinedStream = Stream.merge(eventBatchStream, heartbeatStream);

				// Prepend connected event and format as event stream
				const stream = Stream.concat(connectedStream, combinedStream).pipe(
					Stream.map((event) =>
						new TextEncoder().encode(formatEventStream(event)),
					),
				);

				return HttpServerResponse.stream(stream, {
					contentType: "text/event-stream",
					headers: {
						"cache-control": "no-cache",
						connection: "keep-alive",
					},
				});
			}).pipe(
				Effect.catchAllCause((_) =>
					Effect.fail(new ApiError.InternalServerError()),
				),
			),
		)
		.handle("delete", (_) =>
			Effect.gen(function* () {
				// For now, we don't support deleting projects
				return yield* Effect.fail(new ApiError.NotFound());
			}),
		),
).pipe(Layer.provide(AuthorizationLive));

export const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(healthGroupLive),
	Layer.provide(projectGroupLive),
);
