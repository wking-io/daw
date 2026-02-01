import { Api, Authorization, HealthResponse } from "@daw/core/api/endpoints";
import * as ApiError from "@daw/core/api/errors";
import { EditorEventBatch } from "@daw/core/events/editor";
import { ServerHeartbeatEvent, ServerSubscribedEvent } from "@daw/core/events/server";
import { ProjectId } from "@daw/core/ids";
import { ProjectVersion } from "@daw/core/versions";
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

class RequestId extends HttpApiMiddleware.Tag<RequestId>()("server/RequestId", {}) {}

export const RequestIdMiddleware = Layer.effect(
  RequestId,
  Effect.gen(function* () {
    // effect(returnEffectInGen): Intentionally returning Effect as middleware implementation
    // @effect-diagnostics-next-line returnEffectInGen:off
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const requestId = request.headers["x-request-id"] ?? crypto.randomUUID();

      yield* HttpApp.appendPreResponseHandler((_req, response) =>
        Effect.succeed(HttpServerResponse.setHeader(response, "x-request-id", requestId)),
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

const makeSubscribeStream = (options: { projectId?: ProjectId }) =>
  Effect.gen(function* () {
    const projectStore = yield* ProjectStore;
    const config = yield* ServerConfig;
    const useTestStream = Boolean(config.enableTestStream && options.projectId);

    const connectedStream = Stream.make(
      ServerSubscribedEvent.make({
        t: "server.subscribed",
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

    const liveEventSource = options.projectId
      ? projectStore.subscribe(options.projectId)
      : projectStore.subscribeAll();

    const testProjectId = options.projectId ?? ProjectId.make("test-project");
    const testEvents = Stream.repeatEffect(
      Effect.delay(
        Effect.sync(() =>
          EditorEventBatch.make({
            t: "events",
            id: testProjectId,
            projectId: testProjectId,
            version: ProjectVersion.make(2),
            events: [
              {
                t: "project.timeSignatureChanged",
                timeSignature: { numerator: 3, denominator: 4 },
              },
            ],
          }),
        ),
        Duration.millis(1500),
      ),
    );
    const testEventStream = Stream.make(
      EditorEventBatch.make({
        t: "events",
        id: testProjectId,
        projectId: testProjectId,
        version: ProjectVersion.make(1),
        events: [{ t: "project.renamed", name: "Test Project" }],
      }),
    ).pipe(Stream.concat(testEvents));

    const eventBatchStream = useTestStream
      ? testEventStream
      : liveEventSource.pipe(
          Stream.map(
            (msg): EditorEventBatch => ({
              t: "events",
              id: msg.projectId,
              projectId: msg.projectId,
              version: msg.version,
              events: msg.events,
            }),
          ),
        );

    const combinedStream = Stream.merge(eventBatchStream, heartbeatStream);

    const stream = Stream.concat(connectedStream, combinedStream).pipe(
      Stream.map((event) => new TextEncoder().encode(formatEventStream(event))),
    );

    return HttpServerResponse.stream(stream, {
      contentType: "text/event-stream",
      headers: {
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  });

const eventsGroupLive = HttpApiBuilder.group(Api, "events", (handlers) =>
  handlers.handle("subscribe", ({ urlParams }) =>
    makeSubscribeStream({ projectId: urlParams.projectId }),
  ),
).pipe(Layer.provide(AuthorizationLive));

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
          NoSuchElementException: () => Effect.fail(new ApiError.InternalServerError()),
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
          if (e._tag === "Gone") return new ApiError.Gone({ detail: (e as ApiError.Gone).detail });
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
    .handle("delete", ({ path, payload }) =>
      Effect.gen(function* () {
        const commandHandler = yield* ProjectCommandHandler;
        return yield* commandHandler.execute(path.projectId, payload);
      }).pipe(
        Effect.mapError((e) => {
          if (e._tag === "NotFound" || e._tag === "Gone") return new ApiError.NotFound();
          return new ApiError.InternalServerError();
        }),
      ),
    ),
).pipe(Layer.provide(AuthorizationLive));

export const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(healthGroupLive),
  Layer.provide(eventsGroupLive),
  Layer.provide(projectGroupLive),
);
