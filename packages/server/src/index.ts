import { HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { mkdirSync } from "fs";
import path from "path";
import type { ServerConfigService } from "./config";
import { ServerConfig, ServerConfigLive } from "./config";
import { PersistenceLive } from "./persist/sqlite";
import { ProjectHandlersLive } from "./rpc/handlers";
import { ProjectRpcs } from "./rpc/requests";
import { RpcHttpRoutesLive } from "./rpc/server";
import { DawStoreLive } from "./store/store";

const RpcLayer = RpcServer.layer(ProjectRpcs).pipe(
	Layer.provide(ProjectHandlersLive),
);
const HttpProtocol = RpcServer.layerProtocolHttp({ path: "/rpc" }).pipe(
	Layer.provide(RpcSerialization.layerNdjson),
);

const makeHttpLive = (config: ServerConfigService) =>
	HttpRouter.Default.serve(HttpMiddleware.cors()).pipe(
		HttpServer.withLogAddress,
		Layer.provide(RpcLayer),
		Layer.provide(HttpProtocol),
		Layer.provide(RpcHttpRoutesLive),
		Layer.provide(DawStoreLive),
		Layer.provide(PersistenceLive),
		Layer.provide(SqliteClient.layer({ filename: config.stateDbPath })),
		Layer.provide(
			BunHttpServer.layer({
				port: config.statePort,
				// Disable idle timeout for SSE connections (default is 10s)
				idleTimeout: 0,
			}),
		),
	);

const Main = Effect.gen(function* () {
	const config = yield* ServerConfig;
	mkdirSync(path.dirname(config.stateDbPath), { recursive: true });

	yield* Layer.launch(makeHttpLive(config)).pipe(Effect.scoped);
}).pipe(Effect.provide(ServerConfigLive));

BunRuntime.runMain(Main);
