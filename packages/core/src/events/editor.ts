import { Schema } from "effect";
import { EventBatch } from ".";
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
export type EditorEvent = typeof EditorEvent.Type;

export const EditorEventBatch = EventBatch("ProjectVersion", EditorEvent);
