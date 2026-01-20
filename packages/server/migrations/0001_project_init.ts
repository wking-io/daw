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

	yield* sql`
		CREATE TABLE IF NOT EXISTS tracks (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			type TEXT NOT NULL CHECK (type IN ('audio', 'midi', 'bus')),
			name TEXT NOT NULL,
			color TEXT NOT NULL DEFAULT '#808080',
			volume_db REAL NOT NULL DEFAULT 0,
			pan REAL NOT NULL DEFAULT 0,
			mute INTEGER NOT NULL DEFAULT 0,
			solo INTEGER NOT NULL DEFAULT 0,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS clips (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			project_id TEXT NOT NULL,
			track_id TEXT NOT NULL,
			start_qn REAL NOT NULL,
			size_qn REAL NOT NULL,
			loop_enabled INTEGER NOT NULL DEFAULT 0,
			loop_length_qn REAL NOT NULL DEFAULT 4,
			sort_order INTEGER NOT NULL DEFAULT 0,
			payload_kind TEXT NOT NULL CHECK (payload_kind IN ('midi', 'audio')),
			pattern_id TEXT,
			audio_file_id TEXT,
			audio_offset_sec REAL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS midi_patterns (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS midi_notes (
			id TEXT PRIMARY KEY,
			pattern_id TEXT NOT NULL,
			pitch INTEGER NOT NULL CHECK (pitch >= 0 AND pitch <= 127),
			velocity INTEGER NOT NULL CHECK (velocity >= 0 AND velocity <= 127),
			start_qn REAL NOT NULL,
			size_qn REAL NOT NULL,
			FOREIGN KEY (pattern_id) REFERENCES midi_patterns(id) ON DELETE CASCADE
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS automation_lanes (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			track_id TEXT NOT NULL,
			param_path TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS automation_points (
			id TEXT PRIMARY KEY,
			lane_id TEXT NOT NULL,
			time_qn REAL NOT NULL,
			value REAL NOT NULL,
			curve TEXT NOT NULL DEFAULT 'linear' CHECK (curve IN ('linear', 'expo', 'log', 'hold')),
			FOREIGN KEY (lane_id) REFERENCES automation_lanes(id) ON DELETE CASCADE
		)
	`;

	yield* sql`
		CREATE TABLE IF NOT EXISTS audio_files (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			name TEXT NOT NULL,
			original_path TEXT NOT NULL,
			stored_path TEXT NOT NULL,
			duration_sec REAL NOT NULL,
			sample_rate INTEGER NOT NULL,
			channels INTEGER NOT NULL CHECK (channels >= 1 AND channels <= 8),
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)
	`;

	// Indexes for common queries
	yield* sql`CREATE INDEX IF NOT EXISTS idx_snapshots_project ON snapshots(project_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_tracks_project ON tracks(project_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_clips_project ON clips(project_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_clips_track ON clips(track_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_midi_patterns_project ON midi_patterns(project_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_midi_notes_pattern ON midi_notes(pattern_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_automation_lanes_project ON automation_lanes(project_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_automation_lanes_track ON automation_lanes(track_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_automation_points_lane ON automation_points(lane_id)`;
	yield* sql`CREATE INDEX IF NOT EXISTS idx_audio_files_project ON audio_files(project_id)`;
});
