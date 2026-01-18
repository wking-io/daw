import { Project, type SSE } from "@daw/contract";
import {
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { Duration, Effect, Layer, Ref, Schema, Stream } from "effect";
import { ServerConfig } from "../config";
import { DawStore } from "../store/store";
import { formatSSE } from "../utils/sse";

const HEARTBEAT_INTERVAL_MS = 30000;

type WsClient = {
	id: string;
	send: (payload: unknown) => Effect.Effect<void>;
};

type WsLock = {
	resource: string;
	clientId: string;
	acquiredAt: number;
};

type WsState = {
	clients: Map<string, WsClient>;
	locks: Map<string, WsLock>;
};

class DawRouter extends HttpRouter.Tag("DawRouter")<DawRouter>() {}

const DawRoutes = DawRouter.use((router) =>
	Effect.gen(function* () {
		const store = yield* DawStore;
		const config = yield* ServerConfig;
		const authToken = config.stateAuthToken;
		const wsState = yield* Ref.make<WsState>({
			clients: new Map(),
			locks: new Map(),
		});

		const isAuthorized = (
			request: HttpServerRequest.HttpServerRequest,
			url?: URL,
		) => {
			if (!authToken) return true;
			const authHeader = request.headers["authorization"];
			if (authHeader === `Bearer ${authToken}`) return true;
			if (url) {
				const token = url.searchParams.get("token");
				if (token === authToken) return true;
			}
			return false;
		};

		const broadcast = (payload: unknown) =>
			Effect.flatMap(Ref.get(wsState), (state) =>
				Effect.forEach(
					Array.from(state.clients.values()),
					(client) => client.send(payload),
					{ discard: true },
				),
			);

		const broadcastPresence = () =>
			Effect.flatMap(Ref.get(wsState), (state) =>
				broadcast({ t: "presence", clients: Array.from(state.clients.keys()) }),
			);

		const broadcastLocks = () =>
			Effect.flatMap(Ref.get(wsState), (state) =>
				broadcast({ t: "locks", locks: Array.from(state.locks.values()) }),
			);

		const registerClient = (nextClientId: string, send: WsClient["send"]) =>
			Ref.update(wsState, (state) => {
				const clients = new Map(state.clients);
				clients.set(nextClientId, { id: nextClientId, send });
				return { ...state, clients };
			}).pipe(
				Effect.zipRight(broadcastPresence()),
				Effect.zipRight(broadcastLocks()),
			);

		const unregisterClient = (nextClientId: string) =>
			Ref.update(wsState, (state) => {
				const clients = new Map(state.clients);
				clients.delete(nextClientId);
				const locks = new Map(state.locks);
				for (const [resource, lock] of locks.entries()) {
					if (lock.clientId === nextClientId) {
						locks.delete(resource);
					}
				}
				return { ...state, clients, locks };
			}).pipe(
				Effect.zipRight(broadcastPresence()),
				Effect.zipRight(broadcastLocks()),
			);

		const acquireLock = (resource: string, clientId: string) =>
			Ref.modify(wsState, (state) => {
				if (state.locks.has(resource)) {
					return [false, state] as const;
				}
				const locks = new Map(state.locks);
				locks.set(resource, { resource, clientId, acquiredAt: Date.now() });
				return [true, { ...state, locks }] as const;
			});

		const releaseLock = (resource: string, clientId: string) =>
			Ref.modify(wsState, (state) => {
				const current = state.locks.get(resource);
				if (!current || current.clientId !== clientId) {
					return [false, state] as const;
				}
				const locks = new Map(state.locks);
				locks.delete(resource);
				return [true, { ...state, locks }] as const;
			});
		yield* router.get(
			"/health",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				if (!isAuthorized(request)) {
					return HttpServerResponse.text("Unauthorized", { status: 401 });
				}
				const version = process.env.DAW_SERVER_VERSION ?? "dev";
				return yield* HttpServerResponse.json({ healthy: true, version });
			}),
		);

		yield* router.get(
			"/snapshot",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				if (!isAuthorized(request)) {
					return HttpServerResponse.text("Unauthorized", { status: 401 });
				}
				const snapshot = yield* store.getSnapshot;
				return yield* HttpServerResponse.schemaJson(Project.Snapshot)(snapshot);
			}),
		);

		yield* router.post(
			"/submitOp",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				if (!isAuthorized(request)) {
					return HttpServerResponse.text("Unauthorized", { status: 401 });
				}
				const submit = yield* HttpServerRequest.schemaBodyJson(Project.Submit);
				const result = yield* store.submitOp(submit);
				return yield* HttpServerResponse.schemaJson(Project.SubmitResult)(
					result,
				);
			}),
		);

		yield* router.get(
			"/ops",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				const baseUrl = `http://${request.headers["host"] ?? "127.0.0.1"}`;
				const url = new URL(request.url, baseUrl);
				if (!isAuthorized(request, url)) {
					return HttpServerResponse.text("Unauthorized", { status: 401 });
				}
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				const normalizedFromVersion = Number.isNaN(fromVersion)
					? 0
					: fromVersion;
				const ops = yield* store.getOpsAfter(normalizedFromVersion);
				return yield* HttpServerResponse.schemaJson(Project.OpsResponse)({
					fromVersion: normalizedFromVersion,
					ops,
				});
			}),
		);

		yield* router.get(
			"/ws",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				const baseUrl = `http://${request.headers["host"] ?? "127.0.0.1"}`;
				const url = new URL(request.url, baseUrl);
				if (!isAuthorized(request, url)) {
					return HttpServerResponse.text("Unauthorized", { status: 401 });
				}
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				const normalizedFromVersion = Number.isNaN(fromVersion)
					? 0
					: fromVersion;
				const socket = yield* request.upgrade;
				const write = yield* socket.writer;
				const decoder = new TextDecoder();
				const encodeOpEntry = Schema.encodeSync(Project.OpEntry);
				const send = (payload: unknown) =>
					write(JSON.stringify(payload)).pipe(
						Effect.catchAll(() => Effect.void),
					);
				let clientId: string | null = null;

				const sendOps = Effect.flatMap(
					store.opStreamFrom(normalizedFromVersion),
					(stream) =>
						Stream.runForEach(stream, (entry) =>
							send({ t: "op", entry: encodeOpEntry(entry) }),
						),
				);

				const receive = socket.runRaw(
					(data) => {
						const text = typeof data === "string" ? data : decoder.decode(data);
						let message: { t?: string } & Record<string, unknown>;
						try {
							message = JSON.parse(text) as typeof message;
						} catch {
							return Effect.void;
						}
						if (message.t === "hello") {
							const nextClientId = String(message.clientId ?? "unknown");
							clientId = nextClientId;
							return registerClient(nextClientId, send).pipe(
								Effect.zipRight(
									Effect.flatMap(store.getSnapshot, (snapshot) =>
										send({
											t: "hello",
											clientId: nextClientId,
											serverVersion: snapshot.version,
										}),
									),
								),
							);
						}
						if (message.t === "lock") {
							const action = String(message.action ?? "");
							const resource = String(message.resource ?? "");
							if (!resource) return Effect.void;
							if (action === "acquire") {
								const owner = clientId ?? String(message.clientId ?? "unknown");
								return Effect.flatMap(acquireLock(resource, owner), (ok) =>
									ok
										? broadcastLocks().pipe(
												Effect.zipRight(
													send({ t: "lock", ok: true, resource }),
												),
											)
										: Effect.flatMap(Ref.get(wsState), (state) =>
												send({
													t: "lock",
													ok: false,
													resource,
													owner: state.locks.get(resource)?.clientId ?? null,
												}),
											),
								);
							}
							if (action === "release") {
								const owner = clientId ?? String(message.clientId ?? "unknown");
								return Effect.flatMap(releaseLock(resource, owner), (ok) =>
									ok
										? broadcastLocks().pipe(
												Effect.zipRight(
													send({ t: "lock", ok: true, resource }),
												),
											)
										: Effect.void,
								);
							}
							return Effect.void;
						}
						return Effect.void;
					},
					{
						onOpen: Effect.gen(function* () {
							const snapshot = yield* store.getSnapshot;
							yield* send({
								t: "hello",
								serverVersion: snapshot.version,
							});
						}),
					},
				);

				const lifecycle = Effect.raceFirst(sendOps, receive).pipe(
					Effect.ensuring(
						Effect.suspend(() =>
							clientId ? unregisterClient(clientId) : Effect.void,
						),
					),
					Effect.catchAll(() => Effect.void),
				);
				yield* Effect.forkDaemon(lifecycle);
				return HttpServerResponse.empty();
			}),
		);

		// SSE event stream endpoint
		yield* router.get(
			"/event",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				const baseUrl = `http://${request.headers["host"] ?? "127.0.0.1"}`;
				const url = new URL(request.url, baseUrl);
				if (!isAuthorized(request, url)) {
					return HttpServerResponse.text("Unauthorized", { status: 401 });
				}
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				const normalizedFromVersion = Number.isNaN(fromVersion)
					? 0
					: fromVersion;

				const snapshot = yield* store.getSnapshot;
				const encodeOpEntry = Schema.encodeSync(Project.OpEntry);
				const encodePatchBatch = Schema.encodeSync(Project.PatchBatch);

				// Create connected event
				const connectedEvent: SSE.ServerConnectedEvent = {
					t: "server.connected",
					serverVersion: snapshot.version,
				};

				// Create heartbeat stream (each emission is delayed by HEARTBEAT_INTERVAL_MS)
				const heartbeatStream = Stream.repeatEffect(
					Effect.delay(
						Effect.sync(
							(): SSE.ServerHeartbeatEvent => ({
								t: "server.heartbeat",
								timestamp: Date.now(),
							}),
						),
						Duration.millis(HEARTBEAT_INTERVAL_MS),
					),
				);

				// Get op stream and map to SSE events
				const opStream = yield* store.opStreamFrom(normalizedFromVersion);
				const opEventStream = opStream.pipe(
					Stream.map(
						(entry): SSE.OpEvent => ({
							t: "op",
							entry: encodeOpEntry(entry) as Project.OpEntry,
						}),
					),
				);

				// Get patch stream and map to SSE events
				const patchStream = yield* store.patchStreamFrom(normalizedFromVersion);
				const patchEventStream = patchStream.pipe(
					Stream.map(
						(batch): SSE.PatchEvent => ({
							t: "patch",
							batch: encodePatchBatch(batch) as unknown as Project.PatchBatch,
						}),
					),
				);

				// Combine all event streams
				const combinedStream = Stream.merge(
					Stream.merge(opEventStream, patchEventStream),
					heartbeatStream,
				);

				// Prepend connected event and format as SSE
				const sseStream = Stream.concat(
					Stream.make(connectedEvent as SSE.SSEEvent),
					combinedStream,
				).pipe(
					Stream.map((event) => new TextEncoder().encode(formatSSE(event))),
				);

				return HttpServerResponse.stream(sseStream, {
					contentType: "text/event-stream",
					headers: {
						"cache-control": "no-cache",
						connection: "keep-alive",
					},
				});
			}),
		);
	}),
);

const DawRoutesLive = DawRoutes.pipe(Layer.provideMerge(DawRouter.Live));

export const RpcHttpRoutesLive = HttpRouter.Default.use((router) =>
	Effect.gen(function* () {
		yield* router.mount("/", yield* DawRouter.router);
	}),
).pipe(Layer.provide(DawRoutesLive));
