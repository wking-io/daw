// Initial schema migration - creates core tables for event sourcing
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
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
