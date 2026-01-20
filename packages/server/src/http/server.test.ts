import { afterEach, describe, expect, it } from "bun:test";
import type { Commands, Events, ProjectId, SSE } from "@daw/contract";
import { HttpApiBuilder, HttpServer } from "@effect/platform";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { ServerConfigTest } from "../config";
import { PersistenceLive } from "../persist/sqlite";
import { StoreLive } from "../store/store";
import { ApiLive } from "./server";

const TEST_TOKEN = "test-token-123";
const TEST_PROJECT_ID = "test-project" as ProjectId;

// Create tables manually for tests (matches migration)
const SetupLayer = Layer.effectDiscard(
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		yield* sql`
			CREATE TABLE IF NOT EXISTS snapshots (
				project_id TEXT NOT NULL,
				version INTEGER NOT NULL,
				data TEXT NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (project_id, version)
			)
		`;
		yield* sql`
			CREATE TABLE IF NOT EXISTS events (
				project_id TEXT NOT NULL,
				version INTEGER NOT NULL,
				data TEXT NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (project_id, version)
			)
		`;
		yield* sql`
			CREATE TABLE IF NOT EXISTS projects (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`;
	}),
);

const makeLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });
	const persistenceLayer = PersistenceLive.pipe(
		Layer.provideMerge(SetupLayer),
		Layer.provide(sqlLayer),
	);
	const storeLayer = StoreLive.pipe(Layer.provide(persistenceLayer));
	const configLayer = ServerConfigTest({ authToken: TEST_TOKEN });

	// ApiLive needs ServerConfig and Store
	const apiWithDeps = ApiLive.pipe(
		Layer.provide(storeLayer),
		Layer.provide(configLayer),
	);

	return Layer.mergeAll(apiWithDeps, HttpServer.layerContext);
};

describe("HttpEndpoints", () => {
	let dispose: (() => Promise<void>) | null = null;

	afterEach(async () => {
		if (dispose) {
			await dispose();
			dispose = null;
		}
	});

	it("serves snapshot and executeCommand", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		// Get snapshot (project is lazily created)
		const snapshotRes = await handler(
			new Request(`http://localhost/api/projects/${TEST_PROJECT_ID}/snapshot`, {
				headers: { Authorization: `Bearer ${TEST_TOKEN}` },
			}),
		);
		expect(snapshotRes.status).toBe(200);
		const snapshot = (await snapshotRes.json()) as Events.Snapshot;
		expect(snapshot.version).toBe(0);

		// Execute command
		const command: Commands.Command = {
			commandId: "cmd-1",
			expectedVersion: snapshot.version,
			actor: "ui",
			payload: {
				t: "project.rename",
				name: "My Project",
			},
		};

		const commandRes = await handler(
			new Request(`http://localhost/api/projects/${TEST_PROJECT_ID}/commands`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					Authorization: `Bearer ${TEST_TOKEN}`,
				},
				body: JSON.stringify(command),
			}),
		);
		expect(commandRes.status).toBe(200);
		const commandResult = (await commandRes.json()) as Events.CommandResult;
		expect(commandResult.version).toBe(1);
		expect(commandResult.events.events[0]?.t).toBe("project.renamed");
	});

	it("serves health check", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		// Health endpoint doesn't require auth
		const res = await handler(new Request("http://localhost/api/health"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { healthy: boolean; version: string };
		expect(body.healthy).toBe(true);
		expect(body.version).toBeDefined();
	});

	it("serves SSE event stream with server.connected event", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(
			new Request(
				`http://localhost/api/projects/${TEST_PROJECT_ID}/subscribe?fromVersion=0`,
				{
					headers: { Authorization: `Bearer ${TEST_TOKEN}` },
				},
			),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/event-stream");

		const reader = res.body?.getReader();
		expect(reader).toBeDefined();
		if (!reader) throw new Error("Reader is undefined");

		// Read the first chunk which should contain the connected event
		const { value, done } = await reader.read();
		expect(done).toBe(false);

		const text = new TextDecoder().decode(value);
		expect(text).toContain("data:");

		// Parse the SSE data
		const dataLine = text.split("\n").find((line) => line.startsWith("data:"));
		expect(dataLine).toBeDefined();
		if (!dataLine) throw new Error("Data line is undefined");

		const eventData = JSON.parse(dataLine.slice(6)) as SSE.SSEEvent;
		expect(eventData.t).toBe("server.connected");
		if (eventData.t === "server.connected") {
			expect(eventData.serverVersion).toBe(0);
		}

		// Cancel the stream
		await reader.cancel();
	});

	it("returns 401 Unauthorized without token", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		// Projects endpoint requires auth
		const res = await handler(new Request("http://localhost/api/projects"));
		expect(res.status).toBe(401);
	});

	it("serves getEvents", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(
			new Request(
				`http://localhost/api/projects/${TEST_PROJECT_ID}/events?fromVersion=0`,
				{
					headers: { Authorization: `Bearer ${TEST_TOKEN}` },
				},
			),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Events.EventBatch[];
		expect(Array.isArray(body)).toBe(true);
	});

	it("returns empty list for listProjects", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(
			new Request("http://localhost/api/projects", {
				headers: { Authorization: `Bearer ${TEST_TOKEN}` },
			}),
		);
		expect(res.status).toBe(200);
		const projects = (await res.json()) as Array<{ id: string }>;
		// In multi-project model, starts with empty list
		expect(Array.isArray(projects)).toBe(true);
	});
});
