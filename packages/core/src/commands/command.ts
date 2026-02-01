import { Schema } from "effect";
import { CommandId } from "../ids";
import type { SchemaOf } from "../utils/schema-of";
import { type ValidVersion, Version } from "../versions";
import { AudioFileOperation } from "./audio-file-ops";
import { AutomationOperation } from "./automation-ops";
import { ClipOperation } from "./clip-ops";
import { MidiOperation } from "./midi-ops";
import { ProjectCreate, ProjectDelete, ProjectOperation } from "./project-ops";
export { ProjectCreate, ProjectDelete };

import { TrackOperation } from "./track-ops";

export const CommandPayload = Schema.Union(
  ProjectOperation,
  TrackOperation,
  ClipOperation,
  MidiOperation,
  AutomationOperation,
  AudioFileOperation,
);
export type CommandPayload = typeof CommandPayload.Type;

export const Command = <V extends ValidVersion, P extends SchemaOf<typeof CommandPayload>>(
  version: V,
  payload: P,
) =>
  Schema.Struct({
    id: CommandId,
    expectedVersion: Version(version),
    actor: Schema.Literal("ui", "agent"),
    payload,
  });

export const ProjectCreateCommand = Command("ProjectVersion", ProjectCreate);
export type ProjectCreateCommand = Schema.Schema.Type<typeof ProjectCreateCommand>;

export const ProjectDeleteCommand = Command("ProjectVersion", ProjectDelete);
export type ProjectDeleteCommand = Schema.Schema.Type<typeof ProjectDeleteCommand>;
