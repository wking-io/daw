import { Project } from "@daw/contract";
import * as SqlClient from "@effect/sql/SqlClient";
import type { SqlError } from "@effect/sql/SqlError";
import { Context, Effect, Layer, Schema } from "effect";

export interface SnapshotRow {
	version: Project.ProjectVersion;
	doc: Project.ProjectDoc;
}

export interface EventRow {
	version: Project.ProjectVersion;
	submit: Project.Submit;
}

export interface PersistenceService {
	loadLatestSnapshot: Effect.Effect<SnapshotRow | null, SqlError>;
	loadEventsAfter: (
		version: Project.ProjectVersion,
	) => Effect.Effect<ReadonlyArray<EventRow>, SqlError>;
	appendEvent: (event: EventRow) => Effect.Effect<void, SqlError>;
	saveSnapshot: (snapshot: SnapshotRow) => Effect.Effect<void, SqlError>;
}

export class Persistence extends Context.Tag("daw/Persistence")<
	Persistence,
	PersistenceService
>() {}

const encodeDoc = Schema.encodeSync(Project.ProjectDoc);
const decodeDoc = Schema.decodeUnknownSync(Project.ProjectDoc);
const encodeSubmit = Schema.encodeSync(Project.Submit);
const decodeSubmit = Schema.decodeUnknownSync(Project.Submit);

const ensureTables = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`
		CREATE TABLE IF NOT EXISTS daw_snapshots (
			version INTEGER PRIMARY KEY,
			doc_json TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`;
	yield* sql`
		CREATE TABLE IF NOT EXISTS daw_events (
			version INTEGER PRIMARY KEY,
			submit_json TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`;
});

const PersistenceLiveEffect = Effect.gen(function* () {
	yield* ensureTables;
	const sql = yield* SqlClient.SqlClient;

	return Persistence.of({
		loadLatestSnapshot: Effect.gen(function* () {
			const rows = yield* sql<{
				version: number;
				doc_json: string;
			}>`SELECT version, doc_json FROM daw_snapshots ORDER BY version DESC LIMIT 1`;
			const row = rows[0];
			if (!row) return null;
			return {
				version: row.version,
				doc: decodeDoc(JSON.parse(row.doc_json)),
			};
		}),
		loadEventsAfter: (version) =>
			Effect.gen(function* () {
				const rows = yield* sql<{
					version: number;
					submit_json: string;
				}>`SELECT version, submit_json FROM daw_events WHERE version > ${version} ORDER BY version ASC`;
				return rows.map((row) => ({
					version: row.version,
					submit: decodeSubmit(JSON.parse(row.submit_json)),
				}));
			}),
		appendEvent: (event) =>
			sql`
				INSERT OR REPLACE INTO daw_events (version, submit_json)
				VALUES (${event.version}, ${JSON.stringify(encodeSubmit(event.submit))})
			`.pipe(Effect.asVoid),
		saveSnapshot: (snapshot) =>
			sql`
				INSERT OR REPLACE INTO daw_snapshots (version, doc_json)
				VALUES (${snapshot.version}, ${JSON.stringify(encodeDoc(snapshot.doc))})
			`.pipe(Effect.asVoid),
	});
});

export const PersistenceLive = Layer.effect(Persistence, PersistenceLiveEffect);
