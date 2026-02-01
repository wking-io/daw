// Migration 0002: Update schema for multi-project data model
// - Rename doc_json to snapshot_json in daw_snapshots
// - Add project_id to daw_snapshots and daw_events tables
// - Create tables for normalized project entities

import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
		CREATE TABLE IF NOT EXISTS snapshots (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		)
	`;

  yield* sql`
		CREATE TABLE IF NOT EXISTS events (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		)
	`;

  // Indexes for common queries
  yield* sql`CREATE INDEX IF NOT EXISTS idx_snapshots_id_version ON snapshots(id, version)`;
  yield* sql`CREATE INDEX IF NOT EXISTS idx_events_id_version ON events(id, version)`;
});
