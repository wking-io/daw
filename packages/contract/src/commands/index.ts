import { Schema } from "effect";

export * from "./audio-file-ops";
export * from "./automation-ops";
export * from "./clip-ops";
export * from "./midi-ops";
export * from "./project-ops";
export * from "./track-ops";

import { AudioFileOperation } from "./audio-file-ops";
import { AutomationOperation } from "./automation-ops";
import { ClipOperation } from "./clip-ops";
import { MidiOperation } from "./midi-ops";
import { ProjectOperation } from "./project-ops";
import { TrackOperation } from "./track-ops";

/** Union of all command payloads */
export const CommandPayload = Schema.Union(
	ProjectOperation,
	TrackOperation,
	ClipOperation,
	MidiOperation,
	AutomationOperation,
	AudioFileOperation,
);
export type CommandPayload = typeof CommandPayload.Type;

/** @deprecated Use CommandPayload instead */
export const Operation = CommandPayload;
/** @deprecated Use CommandPayload instead */
export type Operation = CommandPayload;

export const ProjectVersion = Schema.Number;
export type ProjectVersion = typeof ProjectVersion.Type;

/** Command envelope - wraps a command payload with metadata */
export const Command = Schema.Struct({
	commandId: Schema.String,
	expectedVersion: ProjectVersion,
	actor: Schema.Literal("ui", "agent"),
	payload: CommandPayload,
});
export type Command = typeof Command.Type;

/** @deprecated Use Command instead */
export const Submit = Command;
/** @deprecated Use Command instead */
export type Submit = Command;
