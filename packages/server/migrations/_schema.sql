CREATE TABLE IF NOT EXISTS "effect_sql_migrations" (
  migration_id integer PRIMARY KEY NOT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp,
  name VARCHAR(255) NOT NULL
);
CREATE TABLE daw_snapshots (
			version INTEGER PRIMARY KEY,
			doc_json TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
CREATE TABLE daw_events (
			version INTEGER PRIMARY KEY,
			submit_json TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

INSERT INTO effect_sql_migrations VALUES(1,'2026-01-20 16:09:53','initial_schema');