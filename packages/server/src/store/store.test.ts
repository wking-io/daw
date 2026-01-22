import { describe, expect, it } from "bun:test";
import type { Commands, ProjectId } from "@daw/core";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Chunk, Effect, Layer, Stream } from "effect";
import { Persistence } from "../persist/sqlite";
import { Store } from "./store";

const testProjectId = "test-project" as ProjectId;

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

const SqlLayer = SqliteClient.layer({ filename: ":memory:" });

const makeLayer = () =>
	Store.Default.pipe(
		Layer.provide(
			Persistence.Default.pipe(
				Layer.provide(SetupLayer),
				Layer.provide(SqlLayer),
			),
		),
		Layer.provide(SqlLayer),
	);

describe("Store", () => {
	it("executes commands and updates snapshot", async () => {
		const program = Effect.gen(function* () {
			const store = yield* Store;
			const before = yield* store.getSnapshot(testProjectId);
			const command: Commands.Command = {
				commandId: "cmd-1",
				expectedVersion: before.version,
				actor: "ui",
				payload: {
					t: "project.rename",
					name: "New Name",
				},
			};
			yield* store.executeCommand(testProjectId, command);
			return yield* store.getSnapshot(testProjectId);
		});

		const snapshot = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(snapshot.version).toBe(1);
		expect(snapshot.project.name).toBe("New Name");
	});

	it("streams events from a version", async () => {
		const program = Effect.gen(function* () {
			const store = yield* Store;
			const before = yield* store.getSnapshot(testProjectId);
			const command: Commands.Command = {
				commandId: "cmd-2",
				expectedVersion: before.version,
				actor: "ui",
				payload: {
					t: "project.setTempo",
					bpm: 140,
				},
			};
			yield* store.executeCommand(testProjectId, command);
			const stream = yield* store.eventStreamFrom(testProjectId, 0);
			return yield* Stream.take(stream, 1).pipe(Stream.runCollect);
		});

		const eventsChunk = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		const events = Chunk.toArray(eventsChunk);
		expect(events).toHaveLength(1);
		expect(events[0]?.events[0]?.t).toBe("project.tempoChanged");
	});
});
