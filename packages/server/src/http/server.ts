import { Api, Authorization, HealthResponse } from "@daw/core/api/endpoints";
import * as ApiError from "@daw/core/api/errors";
import type * as Events from "@daw/core/events/editor";
import { ProjectSubscribedEvent } from "@daw/core/events/project";
import { ServerHeartbeatEvent } from "@daw/core/events/server";
import {
	HttpApiBuilder,
	HttpApiMiddleware,
	HttpApp,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { Duration, Effect, Equivalence, Layer, Redacted, Stream } from "effect";
import { ServerConfig } from "../config";
import { ProjectCommandHandler } from "../projects/command-handler";
import { ProjectLister } from "../projects/lister";
import { ProjectStore } from "../projects/store";
import { formatEventStream } from "../utils/format-event-stream";

class RequestId extends HttpApiMiddleware.Tag<RequestId>()(
	"server/RequestId",
	{},
) {}

export const RequestIdMiddleware = Layer.effect(
	RequestId,
	Effect.gen(function* () {
		// effect(returnEffectInGen): Intentionally returning Effect as middleware implementation
		// @effect-diagnostics-next-line returnEffectInGen:off
		return Effect.gen(function* () {
			const request = yield* HttpServerRequest.HttpServerRequest;
			const requestId = request.headers["x-request-id"] ?? crypto.randomUUID();

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

const projectGroupLive = HttpApiBuilder.group(Api, "project", (handlers) =>
	handlers
		.handle("list", () =>
			Effect.gen(function* () {
				const lister = yield* ProjectLister;
				return yield* lister.list();
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new ApiError.BadRequest()),
					SqlError: () => Effect.fail(new ApiError.InternalServerError()),
				}),
			),
		)
		.handle("create", ({ payload }) =>
			Effect.gen(function* () {
				const commandHandler = yield* ProjectCommandHandler;
				return yield* commandHandler.create(payload);
			}).pipe(
				Effect.catchTags({
					ParseError: () => Effect.fail(new ApiError.BadRequest()),
					SqlError: () => Effect.fail(new ApiError.InternalServerError()),
					NoSuchElementException: () =>
						Effect.fail(new ApiError.InternalServerError()),
				}),
			),
		)
		.handle("get", ({ path }) =>
			Effect.gen(function* () {
				const projectStore = yield* ProjectStore;
				return yield* projectStore.load(path.projectId);
			}).pipe(
				Effect.mapError((e) => {
					if (e._tag === "NotFound") return new ApiError.NotFound();
					if (e._tag === "Gone")
						return new ApiError.Gone({ detail: (e as ApiError.Gone).detail });
					return new ApiError.InternalServerError();
				}),
			),
		)
		.handle("edit", ({ path, payload }) =>
			Effect.gen(function* () {
				const commandHandler = yield* ProjectCommandHandler;
				return yield* commandHandler.execute(path.projectId, payload);
			}).pipe(
				Effect.mapError((e) => {
					if (e._tag === "NotFound") return new ApiError.NotFound();
					return new ApiError.InternalServerError();
				}),
			),
		)
		.handle("subscribe", ({ path }) =>
			Effect.gen(function* () {
				const projectStore = yield* ProjectStore;
				const projectId = path.projectId;
				const project = yield* projectStore.load(projectId);

				const connectedStream = Stream.make(
					ProjectSubscribedEvent.make({
						t: "project.subscribed",
						version: project.version,
						timestamp: Date.now(),
					}),
				);

				const heartbeatStream = Stream.repeatEffect(
					Effect.delay(
						Effect.sync(() =>
							ServerHeartbeatEvent.make({
								t: "server.heartbeat",
								timestamp: Date.now(),
							}),
						),
						Duration.millis(HEARTBEAT_INTERVAL_MS),
					),
				);

				const eventBatchStream = projectStore.subscribe(projectId).pipe(
					Stream.map(
						(msg): Events.EditorEventBatch => ({
							t: "events",
							version: msg.version,
							events: msg.events,
						}),
					),
				);

				const combinedStream = Stream.merge(eventBatchStream, heartbeatStream);

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
		.handle("delete", ({ path, payload }) =>
			Effect.gen(function* () {
				const commandHandler = yield* ProjectCommandHandler;
				return yield* commandHandler.execute(path.projectId, payload);
			}).pipe(
				Effect.mapError((e) => {
					if (e._tag === "NotFound" || e._tag === "Gone")
						return new ApiError.NotFound();
					return new ApiError.InternalServerError();
				}),
			),
		),
).pipe(Layer.provide(AuthorizationLive));

export const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(healthGroupLive),
	Layer.provide(projectGroupLive),
);
