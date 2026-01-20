import { describe, expect, it } from "bun:test";
import type { Commands, Events, ProjectId } from "@daw/contract";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { Persistence, PersistenceLive } from "./sqlite";

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

const makeLayer = () =>
	PersistenceLive.pipe(
		Layer.provideMerge(SetupLayer),
		Layer.provide(SqliteClient.layer({ filename: ":memory:" })),
	);

const testProjectId = "test-project-id" as ProjectId;

describe("Persistence", () => {
	it("saves and loads snapshots", async () => {
		const program = Effect.gen(function* () {
			const persistence = yield* Persistence;
			const snapshot: Events.Snapshot = {
				version: 1,
				project: {
					id: testProjectId,
					name: "Test Project",
					createdAt: new Date(),
					updatedAt: new Date(),
					bpm: 120,
					timeSignature: { numerator: 4, denominator: 4 },
				},
				tracks: [],
				clips: [],
				midiPatterns: [],
				automationLanes: [],
				audioFiles: [],
			};
			yield* persistence.saveSnapshot(testProjectId, snapshot);
			const loaded = yield* persistence.loadLatestSnapshot(testProjectId);
			return loaded;
		});

		const loaded = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(loaded?.version).toBe(1);
		expect(loaded?.project.name).toBe("Test Project");
	});

	it("appends and reads event batches", async () => {
		const program = Effect.gen(function* () {
			const persistence = yield* Persistence;
			const eventBatch: Events.EventBatch = {
				version: 1,
				events: [
					{
						t: "project.renamed",
						name: "Renamed",
					},
				],
			};
			yield* persistence.appendEvent(testProjectId, {
				version: 1,
				batch: eventBatch,
			});
			return yield* persistence.loadEventsAfter(testProjectId, 0);
		});

		const events = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(events).toHaveLength(1);
		expect(events[0]?.batch.events[0]?.t).toBe("project.renamed");
	});

	it("isolates data between projects", async () => {
		const projectA = "project-a" as ProjectId;
		const projectB = "project-b" as ProjectId;

		const program = Effect.gen(function* () {
			const persistence = yield* Persistence;

			// Create snapshots for two projects
			const snapshotA: Events.Snapshot = {
				version: 1,
				project: {
					id: projectA,
					name: "Project A",
					createdAt: new Date(),
					updatedAt: new Date(),
					bpm: 120,
					timeSignature: { numerator: 4, denominator: 4 },
				},
				tracks: [],
				clips: [],
				midiPatterns: [],
				automationLanes: [],
				audioFiles: [],
			};
			const snapshotB: Events.Snapshot = {
				version: 5,
				project: {
					id: projectB,
					name: "Project B",
					createdAt: new Date(),
					updatedAt: new Date(),
					bpm: 140,
					timeSignature: { numerator: 3, denominator: 4 },
				},
				tracks: [],
				clips: [],
				midiPatterns: [],
				automationLanes: [],
				audioFiles: [],
			};

			yield* persistence.saveSnapshot(projectA, snapshotA);
			yield* persistence.saveSnapshot(projectB, snapshotB);

			const loadedA = yield* persistence.loadLatestSnapshot(projectA);
			const loadedB = yield* persistence.loadLatestSnapshot(projectB);

			return { loadedA, loadedB };
		});

		const { loadedA, loadedB } = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);

		expect(loadedA?.project.name).toBe("Project A");
		expect(loadedA?.version).toBe(1);
		expect(loadedB?.project.name).toBe("Project B");
		expect(loadedB?.version).toBe(5);
	});
});
