CREATE TABLE IF NOT EXISTS "effect_sql_migrations" (
  migration_id integer PRIMARY KEY NOT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp,
  name VARCHAR(255) NOT NULL
);
CREATE TABLE snapshots (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		);
CREATE TABLE events (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		);
CREATE INDEX idx_snapshots_id_version ON snapshots(id, version);
CREATE INDEX idx_events_id_version ON events(id, version);

INSERT INTO effect_sql_migrations VALUES(1,'2026-01-23 19:05:06','project_init');