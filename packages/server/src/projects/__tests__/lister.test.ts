import { describe, expect, it } from "bun:test";
import * as Ids from "@daw/core/ids";
import { ProjectVersion } from "@daw/core/versions";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { ProjectLister } from "../lister";

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
	}),
);

const makeTestLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });

	return ProjectLister.Default.pipe(
		Layer.provide(SetupLayer),
		Layer.provideMerge(sqlLayer),
	);
};

describe("ProjectLister", () => {
	it("returns empty list when no projects exist", async () => {
		const result = await Effect.gen(function* () {
			const lister = yield* ProjectLister;
			return yield* lister.list();
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(result).toEqual([]);
	});

	it("returns projects with metadata", async () => {
		const result = await Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			const lister = yield* ProjectLister;

			yield* sql`INSERT INTO snapshots (id, name, version, data) VALUES ('proj-1', 'My Project', 1, '{"bpm":140,"timeSignature":{"numerator":3,"denominator":4}}')`;

			return yield* lister.list();
		}).pipe(Effect.provide(makeTestLayer()), Effect.runPromise);

		expect(result).toHaveLength(1);
		if (!result[0]) throw new Error("No project found");

		expect(result[0].id).toBe(Ids.ProjectId.make("proj-1"));
		expect(result[0].name).toBe("My Project");
		expect(result[0].version).toBe(ProjectVersion.make(1));
	});
});
