CREATE TABLE IF NOT EXISTS "effect_sql_migrations" (
  migration_id integer PRIMARY KEY NOT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp,
  name VARCHAR(255) NOT NULL
);
CREATE TABLE snapshots (
			project_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (project_id, version)
		);
CREATE TABLE events (
			project_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (project_id, version)
		);
CREATE TABLE projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			bpm REAL NOT NULL DEFAULT 120,
			time_sig_numerator INTEGER NOT NULL DEFAULT 4,
			time_sig_denominator INTEGER NOT NULL DEFAULT 4,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
CREATE TABLE tracks (
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
		);
CREATE TABLE clips (
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
		);
CREATE TABLE midi_patterns (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		);
CREATE TABLE midi_notes (
			id TEXT PRIMARY KEY,
			pattern_id TEXT NOT NULL,
			pitch INTEGER NOT NULL CHECK (pitch >= 0 AND pitch <= 127),
			velocity INTEGER NOT NULL CHECK (velocity >= 0 AND velocity <= 127),
			start_qn REAL NOT NULL,
			size_qn REAL NOT NULL,
			FOREIGN KEY (pattern_id) REFERENCES midi_patterns(id) ON DELETE CASCADE
		);
CREATE TABLE automation_lanes (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			track_id TEXT NOT NULL,
			param_path TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
		);
CREATE TABLE automation_points (
			id TEXT PRIMARY KEY,
			lane_id TEXT NOT NULL,
			time_qn REAL NOT NULL,
			value REAL NOT NULL,
			curve TEXT NOT NULL DEFAULT 'linear' CHECK (curve IN ('linear', 'expo', 'log', 'hold')),
			FOREIGN KEY (lane_id) REFERENCES automation_lanes(id) ON DELETE CASCADE
		);
CREATE TABLE audio_files (
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
		);
CREATE INDEX idx_snapshots_project ON snapshots(project_id);
CREATE INDEX idx_events_project ON events(project_id);
CREATE INDEX idx_tracks_project ON tracks(project_id);
CREATE INDEX idx_clips_project ON clips(project_id);
CREATE INDEX idx_clips_track ON clips(track_id);
CREATE INDEX idx_midi_patterns_project ON midi_patterns(project_id);
CREATE INDEX idx_midi_notes_pattern ON midi_notes(pattern_id);
CREATE INDEX idx_automation_lanes_project ON automation_lanes(project_id);
CREATE INDEX idx_automation_lanes_track ON automation_lanes(track_id);
CREATE INDEX idx_automation_points_lane ON automation_points(lane_id);
CREATE INDEX idx_audio_files_project ON audio_files(project_id);

INSERT INTO effect_sql_migrations VALUES(1,'2026-01-21 17:44:23','project_init');