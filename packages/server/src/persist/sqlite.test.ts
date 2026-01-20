import { describe, expect, it } from "bun:test";
import type { Events, ProjectId } from "@daw/contract";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer, Option } from "effect";
import { Persistence } from "./sqlite";

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
	Persistence.Default.pipe(Layer.provide(SetupLayer), Layer.provide(SqlLayer));

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
			yield* persistence.createSnapshot({
				projectId: testProjectId,
				version: snapshot.version,
				data: JSON.stringify(snapshot),
			});
			const loaded = yield* persistence.findSnapshot({
				projectId: testProjectId,
			});
			return loaded;
		});

		const loaded = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(Option.isSome(loaded)).toBe(true);
		if (Option.isSome(loaded)) {
			expect(loaded.value.version).toBe(1);
		}
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
			yield* persistence.createEvent({
				projectId: testProjectId,
				version: 1,
				data: JSON.stringify(eventBatch),
			});
			return yield* persistence.listEvents({
				projectId: testProjectId,
				version: 0,
			});
		});

		const events = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(events).toHaveLength(1);
		expect(events[0]?.version).toBe(1);
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

			yield* persistence.createSnapshot({
				projectId: projectA,
				version: snapshotA.version,
				data: JSON.stringify(snapshotA),
			});
			yield* persistence.createSnapshot({
				projectId: projectB,
				version: snapshotB.version,
				data: JSON.stringify(snapshotB),
			});

			const loadedA = yield* persistence.findSnapshot({ projectId: projectA });
			const loadedB = yield* persistence.findSnapshot({ projectId: projectB });

			return { loadedA, loadedB };
		});

		const { loadedA, loadedB } = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);

		expect(Option.isSome(loadedA)).toBe(true);
		expect(Option.isSome(loadedB)).toBe(true);
		if (Option.isSome(loadedA) && Option.isSome(loadedB)) {
			expect(loadedA.value.version).toBe(1);
			expect(loadedB.value.version).toBe(5);
		}
	});
});
