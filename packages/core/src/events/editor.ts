import { Schema } from "effect";
import { ProjectId } from "../ids";
import { AudioFileEvent } from "./audio";
import { AutomationEvent } from "./automation";
import { ClipEvent } from "./clip";
import { MidiEvent } from "./midi";
import { ProjectEvent } from "./project";
import { TrackEvent } from "./track";

/** Union of all events that can happen in the editor */
export const EditorEvent = Schema.Union(
	// Project
	ProjectEvent,
	// Clip
	ClipEvent,
	// Automation
	AutomationEvent,
	// Audio file
	AudioFileEvent,
	// MIDI
	MidiEvent,
	// Track
	TrackEvent,
);
export type EditorEvent = Schema.Schema.Type<typeof EditorEvent>;

import { EventBatch } from "./event-batch";

const EditorEventBatch = EventBatch("ProjectId", "ProjectVersion", EditorEvent);

export type EditorEventBatch = Schema.Schema.Type<typeof EditorEventBatch>;
