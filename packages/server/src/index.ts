import { HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { SqlClient } from "@effect/sql";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { mkdirSync } from "fs";
import * as path from "path";
import type { ServerConfigService } from "./config";
import { ServerConfig, ServerConfigLive } from "./config";
import { ApiLive, RequestIdMiddleware } from "./http/server";
import { ProjectCommandHandler } from "./projects/command-handler";
import { ProjectEventStore } from "./projects/event-store";
import { ProjectLister } from "./projects/lister";
import { ProjectSnapshotStore } from "./projects/snapshot-store";
import { ProjectStore } from "./projects/store";

const makeHttpLive = (config: ServerConfigService) =>
	HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
		Layer.provide(
			HttpApiBuilder.middlewareCors({
				allowedOrigins: ["*"],
				allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
				allowedHeaders: ["*"],
				credentials: false,
			}),
		),
		Layer.provide(RequestIdMiddleware),
		HttpServer.withLogAddress,
		Layer.provide(ApiLive),
		Layer.provide(ProjectCommandHandler.Default),
		Layer.provide(ProjectLister.Default),
		Layer.provide(ProjectSnapshotStore.Default),
		Layer.provide(ProjectEventStore.Default),
		Layer.provide(ProjectStore.Default),
		Layer.provide(
			BunHttpServer.layer({
				port: config.port,
				idleTimeout: 0,
			}),
		),
	);

const runMigrations = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;

	yield* sql`
		CREATE TABLE IF NOT EXISTS snapshots (
			id TEXT NOT NULL,
			name TEXT NOT NULL DEFAULT '',
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS events (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		)
	`;

	yield* sql`CREATE INDEX IF NOT EXISTS idx_snapshots_id_version ON snapshots(id, version)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_events_id_version ON events(id, version)`;
});

const Main = Effect.gen(function* () {
	const config = yield* ServerConfig;
	mkdirSync(path.dirname(config.db), { recursive: true });

	const sqlLayer = SqliteClient.layer({ filename: config.db });

	yield* runMigrations.pipe(Effect.provide(sqlLayer));

	const httpLayer = makeHttpLive(config).pipe(Layer.provide(sqlLayer));

	yield* Layer.launch(httpLayer).pipe(Effect.scoped);
}).pipe(Effect.provide(ServerConfigLive));

BunRuntime.runMain(Main);
