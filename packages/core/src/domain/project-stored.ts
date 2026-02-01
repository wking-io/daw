import { Schema } from "effect";
import { ProjectId } from "../ids";
import { TimeSignature } from "../lib/time-signature";
import { AudioFile } from "./audio-file";
import { AutomationLane } from "./automation";
import { Clip } from "./clip";
import { MidiPattern } from "./midi";
import type { Project } from "./project";
import { Track } from "./track";

/**
 * Schema version constants for stored projects.
 * Increment CURRENT_SCHEMA_VERSION when making breaking changes to the Project schema.
 */
export const CURRENT_SCHEMA_VERSION: SchemaVersion = 1;

export const SchemaVersion = Schema.Literal(1);
export type SchemaVersion = Schema.Schema.Type<typeof SchemaVersion>;

/**
 * V1 of the stored project schema.
 * This matches the current Project structure.
 */
export const ProjectStoredV1 = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  id: ProjectId,
  name: Schema.String,
  bpm: Schema.Number.pipe(Schema.between(20, 999)),
  timeSignature: TimeSignature,
  tracks: Schema.Array(Track),
  clips: Schema.Array(Clip),
  midiPatterns: Schema.Array(MidiPattern),
  automationLanes: Schema.Array(AutomationLane),
  audioFiles: Schema.Array(AudioFile),
  deletedAt: Schema.OptionFromNullOr(Schema.DateTimeUtc),
});
export type ProjectStoredV1 = Schema.Schema.Type<typeof ProjectStoredV1>;

/**
 * Union of all stored project versions.
 * Add new versions here as the schema evolves.
 */
export const ProjectStored = Schema.Union(ProjectStoredV1);
export type ProjectStored = Schema.Schema.Type<typeof ProjectStored>;

/**
 * Convert a Project (with version) to a ProjectStored (with schemaVersion).
 * Strips the runtime `version` field and adds `schemaVersion` for storage.
 */
export function toStored(project: Project): ProjectStoredV1 {
  const { version: _, ...rest } = project;
  return {
    ...rest,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Convert a ProjectStored to a Project.
 * Migrates older schema versions to the current version if needed.
 */
export function fromStored(stored: ProjectStored, version: number): Project {
  switch (stored.schemaVersion) {
    case 1: {
      const { schemaVersion: _, ...rest } = stored;
      return {
        ...rest,
        version: version as Project["version"],
      };
    }
    default: {
      const _exhaustive: never = stored.schemaVersion;
      throw new Error(`Unknown schema version: ${stored.schemaVersion}`);
    }
  }
}
