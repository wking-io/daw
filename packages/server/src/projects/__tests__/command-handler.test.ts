import { describe, expect, it } from "bun:test";
import { ApiError, Ids, type Project, Versions } from "@daw/core";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer, Option } from "effect";
import { ProjectCommandHandler } from "../command-handler";
import { ProjectEventStore } from "../event-store";
import { ProjectSnapshotStore } from "../snapshot-store";
import { ProjectStore } from "../store";

const SetupLayer = Layer.effectDiscard(
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		yield* sql`
			CREATE TABLE IF NOT EXISTS snapshots (
				id TEXT NOT NULL,
				name TEXT NOT NULL,
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
	}),
);

const makeTestLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });

	const storeStack = Layer.mergeAll(
		ProjectSnapshotStore.Default,
		ProjectEventStore.Default,
		sqlLayer,
	).pipe(Layer.provide(SetupLayer), Layer.provide(sqlLayer));

	const projectStore = ProjectStore.Default.pipe(Layer.provide(storeStack));

	const commandHandler = ProjectCommandHandler.Default.pipe(
		Layer.provide(projectStore),
		Layer.provide(storeStack),
	);

	return Layer.mergeAll(commandHandler, projectStore, storeStack);
};

const createTestProject = (id: string): Project.Project => ({
	id: Ids.ProjectId.make(id),
	name: "Test Project",
	version: Versions.ProjectVersion.make(1),
	bpm: 120,
	timeSignature: { numerator: 4, denominator: 4 },
	tracks: [],
	clips: [],
	midiPatterns: [],
	automationLanes: [],
	audioFiles: [],
	deletedAt: Option.none(),
});

describe("ProjectCommandHandler", () => {
	it("executes a rename command and returns updated project", async () => {
		const projectId = Ids.ProjectId.make("test-project");

		const result = await Effect.gen(function* () {
			const snapshotStore = yield* ProjectSnapshotStore;
			const commandHandler = yield* ProjectCommandHandler;

			const project = createTestProject("test-project");
			yield* snapshotStore.append(project);

			return yield* commandHandler.execute(projectId, {
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(1),
				actor: "ui",
				payload: {
					t: "project.rename",
					name: "Renamed Project",
				},
			});
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(result.name).toBe("Renamed Project");
	});

	it("returns unchanged project when command results in no change", async () => {
		const projectId = Ids.ProjectId.make("test-project");

		const result = await Effect.gen(function* () {
			const snapshotStore = yield* ProjectSnapshotStore;
			const commandHandler = yield* ProjectCommandHandler;

			const project = createTestProject("test-project");
			yield* snapshotStore.append(project);

			return yield* commandHandler.execute(projectId, {
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(1),
				actor: "ui",
				payload: {
					t: "project.rename",
					name: "Test Project",
				},
			});
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(result.name).toBe("Test Project");
	});

	it("deletes a project and sets deletedAt", async () => {
		const projectId = Ids.ProjectId.make("test-project");

		const result = await Effect.gen(function* () {
			const snapshotStore = yield* ProjectSnapshotStore;
			const commandHandler = yield* ProjectCommandHandler;

			const project = createTestProject("test-project");
			yield* snapshotStore.append(project);

			return yield* commandHandler.execute(projectId, {
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(1),
				actor: "ui",
				payload: {
					t: "project.delete",
				},
			});
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(Option.isSome(result.deletedAt)).toBe(true);
	});

	it("returns Gone error when loading a deleted project", async () => {
		const projectId = Ids.ProjectId.make("test-project");

		const error = await Effect.gen(function* () {
			const snapshotStore = yield* ProjectSnapshotStore;
			const commandHandler = yield* ProjectCommandHandler;
			const projectStore = yield* ProjectStore;

			const project = createTestProject("test-project");
			yield* snapshotStore.append(project);

			yield* commandHandler.execute(projectId, {
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(1),
				actor: "ui",
				payload: {
					t: "project.delete",
				},
			});

			return yield* projectStore.load(projectId).pipe(Effect.flip);
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(error).toBeInstanceOf(ApiError.Gone);
	});

	it("creates a snapshot when project is deleted", async () => {
		const projectId = Ids.ProjectId.make("test-project");

		const snapshots = await Effect.gen(function* () {
			const snapshotStore = yield* ProjectSnapshotStore;
			const commandHandler = yield* ProjectCommandHandler;
			const sql = yield* SqlClient.SqlClient;

			const project = createTestProject("test-project");
			yield* snapshotStore.append(project);

			yield* commandHandler.execute(projectId, {
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(1),
				actor: "ui",
				payload: {
					t: "project.delete",
				},
			});

			const rows =
				yield* sql`SELECT * FROM snapshots WHERE id = ${projectId} ORDER BY version DESC`;
			return rows;
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(snapshots.length).toBe(2);
		const latestSnapshot = JSON.parse(snapshots[0].data as string);
		expect(latestSnapshot.deletedAt).not.toBeNull();
	});
});
