import { Project } from "@daw/contract";
import {
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer, Schedule, Schema, Stream } from "effect";
import { DawStore } from "../store/store";

const sseHeaders = {
	"Cache-Control": "no-cache",
	Connection: "keep-alive",
	"Access-Control-Allow-Origin": "*",
	"X-Accel-Buffering": "no",
};

const toSse = (event: string) => (data: unknown) =>
	`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

type WsClient = {
	id: string;
	send: (payload: unknown) => Effect.Effect<void>;
};

type WsLock = {
	resource: string;
	clientId: string;
	acquiredAt: number;
};

const wsClients = new Map<string, WsClient>();
const wsLocks = new Map<string, WsLock>();

const broadcast = (payload: unknown) =>
	Effect.forEach(
		Array.from(wsClients.values()),
		(client) => client.send(payload),
		{
			discard: true,
		},
	);

const broadcastPresence = () =>
	broadcast({ t: "presence", clients: Array.from(wsClients.keys()) });

const broadcastLocks = () =>
	broadcast({ t: "locks", locks: Array.from(wsLocks.values()) });

const keepAlive = Stream.concat(
	Stream.succeed(": keep-alive\n\n"),
	Stream.repeatEffect(Effect.succeed(": keep-alive\n\n")).pipe(
		Stream.schedule(Schedule.spaced("3 seconds")),
	),
);

class DawRouter extends HttpRouter.Tag("DawRouter")<DawRouter>() {}

const DawRoutes = DawRouter.use((router) =>
	Effect.gen(function* () {
		const store = yield* DawStore;
		yield* router.get(
			"/snapshot",
			Effect.gen(function* () {
				const snapshot = yield* store.getSnapshot;
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/snapshot",
							message: "server.snapshot.request",
							data: { version: snapshot.version },
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H11",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				return yield* HttpServerResponse.schemaJson(Project.Snapshot)(snapshot);
			}),
		);

		yield* router.post(
			"/submitOp",
			Effect.gen(function* () {
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
				let clientId: string | null = null;

				const send = (payload: unknown) =>
					write(JSON.stringify(payload)).pipe(
						Effect.catchAll(() => Effect.void),
					);

				const registerClient = (nextClientId: string) =>
					Effect.sync(() => {
						clientId = nextClientId;
						wsClients.set(nextClientId, { id: nextClientId, send });
					}).pipe(
						Effect.zipRight(broadcastPresence()),
						Effect.zipRight(broadcastLocks()),
					);

				const unregisterClient = () =>
					Effect.sync(() => {
						if (!clientId) return;
						wsClients.delete(clientId);
						for (const [resource, lock] of wsLocks.entries()) {
							if (lock.clientId === clientId) {
								wsLocks.delete(resource);
							}
						}
						clientId = null;
					}).pipe(
						Effect.zipRight(broadcastPresence()),
						Effect.zipRight(broadcastLocks()),
					);

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
							return registerClient(nextClientId).pipe(
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
								if (wsLocks.has(resource)) {
									return send({
										t: "lock",
										ok: false,
										resource,
										owner: wsLocks.get(resource)?.clientId ?? null,
									});
								}
								const owner = clientId ?? String(message.clientId ?? "unknown");
								wsLocks.set(resource, {
									resource,
									clientId: owner,
									acquiredAt: Date.now(),
								});
								return broadcastLocks().pipe(
									Effect.zipRight(send({ t: "lock", ok: true, resource })),
								);
							}
							if (action === "release") {
								const current = wsLocks.get(resource);
								if (current && current.clientId === clientId) {
									wsLocks.delete(resource);
									return broadcastLocks().pipe(
										Effect.zipRight(send({ t: "lock", ok: true, resource })),
									);
								}
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
					Effect.ensuring(unregisterClient()),
					Effect.catchAll(() => Effect.void),
				);
				yield* Effect.forkDaemon(lifecycle);
				return HttpServerResponse.empty();
			}),
		);

		yield* router.get(
			"/patches",
			Effect.gen(function* () {
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/patches",
							message: "server.patches.entry",
							data: {},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H26",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const request = yield* HttpServerRequest.HttpServerRequest;
				let rawUrlString = "";
				let rawUrlType = "unknown";
				try {
					const rawUrl = request.url;
					rawUrlType = typeof rawUrl;
					rawUrlString = String(rawUrl);
				} catch (error) {
					// #region agent log
					fetch(
						"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								location: "packages/server/src/rpc/server.ts:/patches",
								message: "server.patches.urlReadError",
								data: { error: String(error) },
								timestamp: Date.now(),
								sessionId: "debug-session",
								runId: "pre-fix",
								hypothesisId: "H26",
							}),
						},
					).catch(() => {});
					// #endregion agent log
					throw error;
				}
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/patches",
							message: "server.patches.rawUrl",
							data: {
								rawUrl: rawUrlString,
								rawUrlType,
								host: request.headers["host"] ?? null,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H10",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const baseUrl = `http://${request.headers["host"] ?? "127.0.0.1"}`;
				let url: URL;
				try {
					url = new URL(rawUrlString, baseUrl);
				} catch (error) {
					// #region agent log
					fetch(
						"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								location: "packages/server/src/rpc/server.ts:/patches",
								message: "server.patches.urlParseError",
								data: { rawUrl: rawUrlString, error: String(error) },
								timestamp: Date.now(),
								sessionId: "debug-session",
								runId: "pre-fix",
								hypothesisId: "H10",
							}),
						},
					).catch(() => {});
					// #endregion agent log
					throw error;
				}
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/patches",
							message: "server.patches.request",
							data: { fromVersion, url: request.url },
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H10",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/patches",
							message: "server.patches.params",
							data: {
								fromVersion,
								probe: url.searchParams.get("probe"),
								accept: request.headers["accept"] ?? null,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H10",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const stream = yield* store.patchStreamFrom(
					Number.isNaN(fromVersion) ? 0 : fromVersion,
				);
				const sseStream = Stream.unwrapScoped(
					Effect.gen(function* () {
						let didLogFirstPatch = false;
						let didLogKeepAlive = false;
						const encoded = stream.pipe(
							Stream.map(Schema.encodeSync(Project.PatchBatch)),
							Stream.tap((batch) => {
								if (didLogFirstPatch) return Effect.void;
								didLogFirstPatch = true;
								// #region agent log
								return Effect.sync(() => {
									fetch(
										"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
										{
											method: "POST",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												location: "packages/server/src/rpc/server.ts:/patches",
												message: "server.patches.emit.first",
												data: { version: batch.version },
												timestamp: Date.now(),
												sessionId: "debug-session",
												runId: "pre-fix",
												hypothesisId: "H28",
											}),
										},
									).catch(() => {});
								});
								// #endregion agent log
							}),
						);
						let keepAliveCount = 0;
						const keepAliveStream = keepAlive.pipe(
							Stream.tap(() => {
								keepAliveCount += 1;
								if (!didLogKeepAlive) {
									didLogKeepAlive = true;
									// #region agent log
									return Effect.sync(() => {
										fetch(
											"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
											{
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({
													location:
														"packages/server/src/rpc/server.ts:/patches",
													message: "server.patches.keepAlive.first",
													data: { fromVersion },
													timestamp: Date.now(),
													sessionId: "debug-session",
													runId: "pre-fix",
													hypothesisId: "H28",
												}),
											},
										).catch(() => {});
									});
									// #endregion agent log
								}
								if (keepAliveCount === 2) {
									// #region agent log
									return Effect.sync(() => {
										fetch(
											"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
											{
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({
													location:
														"packages/server/src/rpc/server.ts:/patches",
													message: "server.patches.keepAlive.second",
													data: { fromVersion },
													timestamp: Date.now(),
													sessionId: "debug-session",
													runId: "pre-fix",
													hypothesisId: "H38",
												}),
											},
										).catch(() => {});
									});
									// #endregion agent log
								}
								return Effect.void;
							}),
						);
						const startedAt = Date.now();
						yield* Effect.addFinalizer(() =>
							Effect.sync(() => {
								// #region agent log
								fetch(
									"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
									{
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											location: "packages/server/src/rpc/server.ts:/patches",
											message: "server.patches.finalizer",
											data: {
												fromVersion,
												elapsedMs: Date.now() - startedAt,
											},
											timestamp: Date.now(),
											sessionId: "debug-session",
											runId: "pre-fix",
											hypothesisId: "H21",
										}),
									},
								).catch(() => {});
								// #endregion agent log
							}),
						);
						return Stream.merge(
							encoded.pipe(Stream.map(toSse("patches"))),
							keepAliveStream,
						).pipe(Stream.encodeText);
					}),
				);
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/patches",
							message: "server.patches.response",
							data: {
								contentType: "text/event-stream; charset=utf-8",
								headers: sseHeaders,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H32",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				return HttpServerResponse.stream(sseStream, {
					contentType: "text/event-stream; charset=utf-8",
					headers: sseHeaders,
				});
			}).pipe(
				Effect.catchAllCause((cause) => {
					// #region agent log
					fetch(
						"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								location: "packages/server/src/rpc/server.ts:/patches",
								message: "server.patches.error",
								data: { cause: String(cause) },
								timestamp: Date.now(),
								sessionId: "debug-session",
								runId: "pre-fix",
								hypothesisId: "H10",
							}),
						},
					).catch(() => {});
					// #endregion agent log
					return Effect.failCause(cause);
				}),
			),
		);

		yield* router.get(
			"/audio-deltas",
			Effect.gen(function* () {
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/audio-deltas",
							message: "server.audio.entry",
							data: {},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H27",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const request = yield* HttpServerRequest.HttpServerRequest;
				let rawUrl = "";
				try {
					rawUrl = String(request.url);
				} catch (error) {
					// #region agent log
					fetch(
						"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								location: "packages/server/src/rpc/server.ts:/audio-deltas",
								message: "server.audio.urlReadError",
								data: { error: String(error) },
								timestamp: Date.now(),
								sessionId: "debug-session",
								runId: "pre-fix",
								hypothesisId: "H27",
							}),
						},
					).catch(() => {});
					// #endregion agent log
					throw error;
				}
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/audio-deltas",
							message: "server.audio.request",
							data: {
								rawUrl,
								host: request.headers["host"] ?? null,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H25",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const baseUrl = `http://${request.headers["host"] ?? "127.0.0.1"}`;
				const url = new URL(request.url, baseUrl);
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				const stream = yield* store.audioStreamFrom(
					Number.isNaN(fromVersion) ? 0 : fromVersion,
				);
				const sseStream = Stream.unwrapScoped(
					Effect.gen(function* () {
						let didLogFirstAudio = false;
						let didLogKeepAlive = false;
						const audioStream = stream.pipe(
							Stream.tap((batch) => {
								if (didLogFirstAudio) return Effect.void;
								didLogFirstAudio = true;
								const version =
									typeof batch === "object" && batch && "version" in batch
										? ((batch as { version?: number }).version ?? null)
										: null;
								// #region agent log
								return Effect.sync(() => {
									fetch(
										"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
										{
											method: "POST",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												location:
													"packages/server/src/rpc/server.ts:/audio-deltas",
												message: "server.audio.emit.first",
												data: { version },
												timestamp: Date.now(),
												sessionId: "debug-session",
												runId: "pre-fix",
												hypothesisId: "H29",
											}),
										},
									).catch(() => {});
								});
								// #endregion agent log
							}),
						);
						let keepAliveCount = 0;
						const keepAliveStream = keepAlive.pipe(
							Stream.tap(() => {
								keepAliveCount += 1;
								if (!didLogKeepAlive) {
									didLogKeepAlive = true;
									// #region agent log
									return Effect.sync(() => {
										fetch(
											"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
											{
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({
													location:
														"packages/server/src/rpc/server.ts:/audio-deltas",
													message: "server.audio.keepAlive.first",
													data: { fromVersion },
													timestamp: Date.now(),
													sessionId: "debug-session",
													runId: "pre-fix",
													hypothesisId: "H29",
												}),
											},
										).catch(() => {});
									});
									// #endregion agent log
								}
								if (keepAliveCount === 2) {
									// #region agent log
									return Effect.sync(() => {
										fetch(
											"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
											{
												method: "POST",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify({
													location:
														"packages/server/src/rpc/server.ts:/audio-deltas",
													message: "server.audio.keepAlive.second",
													data: { fromVersion },
													timestamp: Date.now(),
													sessionId: "debug-session",
													runId: "pre-fix",
													hypothesisId: "H39",
												}),
											},
										).catch(() => {});
									});
									// #endregion agent log
								}
								return Effect.void;
							}),
						);
						const startedAt = Date.now();
						yield* Effect.addFinalizer(() =>
							Effect.sync(() => {
								// #region agent log
								fetch(
									"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
									{
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											location:
												"packages/server/src/rpc/server.ts:/audio-deltas",
											message: "server.audio.finalizer",
											data: {
												fromVersion,
												elapsedMs: Date.now() - startedAt,
											},
											timestamp: Date.now(),
											sessionId: "debug-session",
											runId: "pre-fix",
											hypothesisId: "H22",
										}),
									},
								).catch(() => {});
								// #endregion agent log
							}),
						);
						return Stream.merge(
							audioStream.pipe(Stream.map(toSse("audio-deltas"))),
							keepAliveStream,
						).pipe(Stream.encodeText);
					}),
				);
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/rpc/server.ts:/audio-deltas",
							message: "server.audio.response",
							data: {
								contentType: "text/event-stream; charset=utf-8",
								headers: sseHeaders,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H33",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				return HttpServerResponse.stream(sseStream, {
					contentType: "text/event-stream; charset=utf-8",
					headers: sseHeaders,
				});
			}).pipe(
				Effect.catchAllCause((cause) => {
					// #region agent log
					fetch(
						"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								location: "packages/server/src/rpc/server.ts:/audio-deltas",
								message: "server.audio.error",
								data: { cause: String(cause) },
								timestamp: Date.now(),
								sessionId: "debug-session",
								runId: "pre-fix",
								hypothesisId: "H27",
							}),
						},
					).catch(() => {});
					// #endregion agent log
					return Effect.failCause(cause);
				}),
			),
		);
	}),
);

const DawRoutesLive = DawRoutes.pipe(Layer.provideMerge(DawRouter.Live));

export const RpcHttpRoutesLive = HttpRouter.Default.use((router) =>
	Effect.gen(function* () {
		yield* router.mount("/", yield* DawRouter.router);
	}),
).pipe(Layer.provide(DawRoutesLive));
