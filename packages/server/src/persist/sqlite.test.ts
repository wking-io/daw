import { describe, expect, it } from "bun:test";
import type { ProjectId } from "@daw/core";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Cause, Effect, Exit, Layer, Option } from "effect";
import { Persistence } from "./sqlite";

// Create tables manually for tests (matches production migration)
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
				bpm REAL NOT NULL DEFAULT 120,
				time_sig_numerator INTEGER NOT NULL DEFAULT 4,
				time_sig_denominator INTEGER NOT NULL DEFAULT 4,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`;
	}),
);

const SqlLayer = SqliteClient.layer({ filename: ":memory:" });

// Layer that provides SetupLayer + raw SqlClient access for tests that need to insert data directly
const makeTestLayerWithSqlClient = () =>
	Layer.mergeAll(
		Persistence.Default.pipe(Layer.provide(SetupLayer)),
		SetupLayer, // This ensures tables are created
	).pipe(Layer.provideMerge(SqlLayer)); // provideMerge keeps SqlClient in the output

const makeLayer = () =>
	Persistence.Default.pipe(Layer.provide(SetupLayer), Layer.provide(SqlLayer));

const testProjectId = "test-project-id" as ProjectId;

// Helper to create a valid snapshot data object for JSON serialization
// Note: Schema.DateFromNumber expects dates as numeric timestamps
const makeSnapshotData = (
	projectId: string,
	version: number,
	name = "Test Project",
) => {
	const now = Date.now();
	return {
		version,
		project: {
			id: projectId,
			name,
			createdAt: now,
			updatedAt: now,
			bpm: 120,
			timeSignature: { numerator: 4, denominator: 4 },
		},
		tracks: [],
		clips: [],
		midiPatterns: [],
		automationLanes: [],
		audioFiles: [],
	};
};

// Helper to create a valid event batch object
const makeEventBatch = (version: number) => ({
	version,
	events: [
		{
			t: "project.renamed" as const,
			name: `Renamed v${version}`,
		},
	],
});

describe("Persistence", () => {
	describe("findSnapshot", () => {
		it("returns Option.none() when no snapshot exists", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				return yield* persistence.findSnapshot({ projectId: testProjectId });
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);
			expect(Option.isNone(result)).toBe(true);
		});

		it("returns the latest snapshot for a project", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;

				// Create multiple snapshots
				const snapshot1 = makeSnapshotData(testProjectId, 1);
				const snapshot2 = makeSnapshotData(testProjectId, 2, "Updated Project");

				yield* persistence.createSnapshot({
					project_id: testProjectId,
					version: snapshot1.version,
					data: JSON.stringify(snapshot1),
				});
				yield* persistence.createSnapshot({
					project_id: testProjectId,
					version: snapshot2.version,
					data: JSON.stringify(snapshot2),
				});

				return yield* persistence.findSnapshot({ projectId: testProjectId });
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(Option.isSome(result)).toBe(true);
			if (Option.isSome(result)) {
				expect(result.value.version).toBe(2);
				expect(result.value.project.name).toBe("Updated Project");
			}
		});

		it("returns error for malformed JSON data", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const sql = yield* SqlClient.SqlClient;

				// Insert invalid JSON directly
				yield* sql`INSERT INTO snapshots (project_id, version, data) VALUES (${testProjectId}, 1, 'invalid json')`;

				return yield* persistence.findSnapshot({ projectId: testProjectId });
			});

			const exit = await Effect.runPromiseExit(
				program.pipe(Effect.provide(makeTestLayerWithSqlClient())),
			);

			// Invalid JSON causes a defect (Die) from JSON.parse
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				// The error could be a Fail (ParseError) or Die (SyntaxError from JSON.parse)
				const hasError =
					Option.isSome(Cause.failureOption(exit.cause)) ||
					Option.isSome(Cause.dieOption(exit.cause));
				expect(hasError).toBe(true);
			}
		});
	});

	describe("createSnapshot", () => {
		it("creates and returns a snapshot", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const snapshot = makeSnapshotData(testProjectId, 1);

				const result = yield* persistence.createSnapshot({
					project_id: testProjectId,
					version: snapshot.version,
					data: JSON.stringify(snapshot),
				});

				return result;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(result.version).toBe(1);
			expect(result.project.id).toBe(testProjectId);
		});

		it("fails with SqlError on duplicate primary key", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const snapshot = makeSnapshotData(testProjectId, 1);

				// Insert first snapshot
				yield* persistence.createSnapshot({
					project_id: testProjectId,
					version: snapshot.version,
					data: JSON.stringify(snapshot),
				});

				// Try to insert duplicate
				yield* persistence.createSnapshot({
					project_id: testProjectId,
					version: snapshot.version,
					data: JSON.stringify(snapshot),
				});
			});

			const exit = await Effect.runPromiseExit(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const error = Cause.failureOption(exit.cause);
				expect(Option.isSome(error)).toBe(true);
				if (Option.isSome(error)) {
					expect(error.value._tag).toBe("SqlError");
				}
			}
		});
	});

	describe("listEvents", () => {
		it("returns empty array when no events exist", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				return yield* persistence.listEvents({
					projectId: testProjectId,
					version: 0,
				});
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);
			expect(result).toHaveLength(0);
		});

		it("returns events after the specified version", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;

				// Create 3 event batches
				for (let i = 1; i <= 3; i++) {
					const eventBatch = makeEventBatch(i);
					yield* persistence.createEvent({
						project_id: testProjectId,
						version: i,
						data: JSON.stringify(eventBatch),
					});
				}

				// Get events after version 1
				return yield* persistence.listEvents({
					projectId: testProjectId,
					version: 1,
				});
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(result).toHaveLength(2);
			expect(result[0]?.version).toBe(2);
			expect(result[1]?.version).toBe(3);
		});

		it("returns events in ascending version order", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;

				// Insert events out of order
				for (const version of [3, 1, 2]) {
					const eventBatch = makeEventBatch(version);
					yield* persistence.createEvent({
						project_id: testProjectId,
						version,
						data: JSON.stringify(eventBatch),
					});
				}

				return yield* persistence.listEvents({
					projectId: testProjectId,
					version: 0,
				});
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(result).toHaveLength(3);
			expect(result[0]?.version).toBe(1);
			expect(result[1]?.version).toBe(2);
			expect(result[2]?.version).toBe(3);
		});
	});

	describe("createEvent", () => {
		it("creates an event successfully", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const eventBatch = makeEventBatch(1);

				yield* persistence.createEvent({
					project_id: testProjectId,
					version: 1,
					data: JSON.stringify(eventBatch),
				});

				// Verify it was created
				const events = yield* persistence.listEvents({
					projectId: testProjectId,
					version: 0,
				});
				return events;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.version).toBe(1);
		});

		it("fails with SqlError on duplicate version", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const eventBatch = makeEventBatch(1);

				yield* persistence.createEvent({
					project_id: testProjectId,
					version: 1,
					data: JSON.stringify(eventBatch),
				});

				// Try duplicate
				yield* persistence.createEvent({
					project_id: testProjectId,
					version: 1,
					data: JSON.stringify(eventBatch),
				});
			});

			const exit = await Effect.runPromiseExit(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const error = Cause.failureOption(exit.cause);
				expect(Option.isSome(error)).toBe(true);
				if (Option.isSome(error)) {
					expect(error.value._tag).toBe("SqlError");
				}
			}
		});
	});

	describe("listProjects", () => {
		it("returns empty array when no projects exist", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				return yield* persistence.listProjects();
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);
			expect(result).toHaveLength(0);
		});

		it("returns all projects in descending creation order", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const sql = yield* SqlClient.SqlClient;

				// Insert projects with explicit timestamps
				yield* sql`INSERT INTO projects (id, name, created_at, updated_at) VALUES ('project-1', 'First Project', '2024-01-01 00:00:00', '2024-01-01 00:00:00')`;
				yield* sql`INSERT INTO projects (id, name, created_at, updated_at) VALUES ('project-2', 'Second Project', '2024-01-02 00:00:00', '2024-01-02 00:00:00')`;
				yield* sql`INSERT INTO projects (id, name, created_at, updated_at) VALUES ('project-3', 'Third Project', '2024-01-03 00:00:00', '2024-01-03 00:00:00')`;

				return yield* persistence.listProjects();
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeTestLayerWithSqlClient())),
			);

			expect(result).toHaveLength(3);
			// Should be in descending creation order
			expect(result[0]?.name).toBe("Third Project");
			expect(result[1]?.name).toBe("Second Project");
			expect(result[2]?.name).toBe("First Project");
		});

		it("correctly maps database columns to domain model", async () => {
			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;
				const sql = yield* SqlClient.SqlClient;

				yield* sql`INSERT INTO projects (id, name, bpm, time_sig_numerator, time_sig_denominator, created_at, updated_at) 
				           VALUES ('test-id', 'Test Project', 140, 3, 8, '2024-01-01 12:00:00', '2024-01-02 14:30:00')`;

				return yield* persistence.listProjects();
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(makeTestLayerWithSqlClient())),
			);

			expect(result).toHaveLength(1);
			const project = result[0];
			expect(project?.id).toBe("test-id" as ProjectId);
			expect(project?.name).toBe("Test Project");
			expect(project?.bpm).toBe(140);
			expect(project?.timeSignature.numerator).toBe(3);
			expect(project?.timeSignature.denominator).toBe(8);
			expect(project?.createdAt).toBeInstanceOf(Date);
			expect(project?.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe("project isolation", () => {
		it("isolates snapshots between projects", async () => {
			const projectA = "project-a" as ProjectId;
			const projectB = "project-b" as ProjectId;

			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;

				// Create snapshots for two different projects
				const snapshotA = makeSnapshotData(projectA, 10, "Project A");
				const snapshotB = makeSnapshotData(projectB, 20, "Project B");

				yield* persistence.createSnapshot({
					project_id: projectA,
					version: snapshotA.version,
					data: JSON.stringify(snapshotA),
				});
				yield* persistence.createSnapshot({
					project_id: projectB,
					version: snapshotB.version,
					data: JSON.stringify(snapshotB),
				});

				const loadedA = yield* persistence.findSnapshot({
					projectId: projectA,
				});
				const loadedB = yield* persistence.findSnapshot({
					projectId: projectB,
				});

				return { loadedA, loadedB };
			});

			const { loadedA, loadedB } = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(Option.isSome(loadedA)).toBe(true);
			expect(Option.isSome(loadedB)).toBe(true);
			if (Option.isSome(loadedA) && Option.isSome(loadedB)) {
				expect(loadedA.value.version).toBe(10);
				expect(loadedA.value.project.name).toBe("Project A");
				expect(loadedB.value.version).toBe(20);
				expect(loadedB.value.project.name).toBe("Project B");
			}
		});

		it("isolates events between projects", async () => {
			const projectA = "project-a" as ProjectId;
			const projectB = "project-b" as ProjectId;

			const program = Effect.gen(function* () {
				const persistence = yield* Persistence;

				// Create events for project A
				for (let i = 1; i <= 3; i++) {
					yield* persistence.createEvent({
						project_id: projectA,
						version: i,
						data: JSON.stringify(makeEventBatch(i)),
					});
				}

				// Create events for project B
				for (let i = 1; i <= 2; i++) {
					yield* persistence.createEvent({
						project_id: projectB,
						version: i,
						data: JSON.stringify(makeEventBatch(i)),
					});
				}

				const eventsA = yield* persistence.listEvents({
					projectId: projectA,
					version: 0,
				});
				const eventsB = yield* persistence.listEvents({
					projectId: projectB,
					version: 0,
				});

				return { eventsA, eventsB };
			});

			const { eventsA, eventsB } = await Effect.runPromise(
				program.pipe(Effect.provide(makeLayer())),
			);

			expect(eventsA).toHaveLength(3);
			expect(eventsB).toHaveLength(2);
		});
	});
});
