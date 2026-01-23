import { Schema } from "effect";
import { AudioFileOperation } from "./audio-file-ops";
import { AutomationOperation } from "./automation-ops";
import { ClipOperation } from "./clip-ops";
import { MidiOperation } from "./midi-ops";
import { ProjectOperation } from "./project-ops";
import { TrackOperation } from "./track-ops";

export const EditorCommandPayload = Schema.Union(
	ProjectOperation,
	TrackOperation,
	ClipOperation,
	MidiOperation,
	AutomationOperation,
	AudioFileOperation,
);
export type EditorCommandPayload = Schema.Schema.Type<
	typeof EditorCommandPayload
>;

import { Command } from "./command";

export const EditorCommand = Command("ProjectVersion", EditorCommandPayload);
export type EditorCommand = Schema.Schema.Type<typeof EditorCommand>;
