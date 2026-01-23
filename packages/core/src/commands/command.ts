import { Schema } from "effect";
import type { SchemaOf } from "../utils/schema-of";
import { type ValidVersion, Version } from "../versions";
import { AudioFileOperation } from "./audio-file-ops";
import { AutomationOperation } from "./automation-ops";
import { ClipOperation } from "./clip-ops";
import { MidiOperation } from "./midi-ops";
import { ProjectOperation } from "./project-ops";
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

export const Command = <
	V extends ValidVersion,
	P extends SchemaOf<typeof CommandPayload>,
>(
	version: V,
	payload: P,
) =>
	Schema.Struct({
		commandId: Schema.String,
		expectedVersion: Version(version),
		actor: Schema.Literal("ui", "agent"),
		payload,
	});
