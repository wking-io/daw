import { HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { mkdirSync } from "fs";
import path from "path";
import type { ServerConfigService } from "./config";
import { ServerConfig, ServerConfigLive } from "./config";
import { ApiLive, RequestIdMiddleware } from "./http/server";
import { ProjectEventStore } from "./projects/event-store";
import { ProjectSnapshotStore } from "./projects/snapshot-store";
import { ProjectStore } from "./projects/store";

const makeHttpLive = (config: ServerConfigService) =>
	HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
		Layer.provide(HttpApiBuilder.middlewareCors()),
		Layer.provide(RequestIdMiddleware),
		HttpServer.withLogAddress,
		Layer.provide(ApiLive),
		Layer.provide(ProjectSnapshotStore.Default),
		Layer.provide(ProjectEventStore.Default),
		Layer.provide(ProjectStore.Default),
		Layer.provide(SqliteClient.layer({ filename: config.db })),
		Layer.provide(
			BunHttpServer.layer({
				port: config.port,
				// Disable idle timeout for SSE connections (default is 10s)
				idleTimeout: 0,
			}),
		),
	);

const Main = Effect.gen(function* () {
	const config = yield* ServerConfig;
	mkdirSync(path.dirname(config.db), { recursive: true });

	yield* Layer.launch(makeHttpLive(config)).pipe(Effect.scoped);
}).pipe(Effect.provide(ServerConfigLive));

BunRuntime.runMain(Main);
