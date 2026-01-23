import { Schema } from "effect";
import type { SchemaOf } from "../utils/schema-of";
import { type ValidVersion, Version } from "../versions";
import { AudioFileEvent } from "./audio";
import { AutomationEvent } from "./automation";
import { ClipEvent } from "./clip";
import { MidiEvent } from "./midi";
import { ProjectEvent } from "./project";
import { TrackEvent } from "./track";

export const Event = Schema.Union(
	ProjectEvent,
	ClipEvent,
	AutomationEvent,
	AudioFileEvent,
	MidiEvent,
	TrackEvent,
);
export type Event = Schema.Schema.Type<typeof Event>;

/** Batch of events at a specific version */
export const EventBatch = <
	V extends ValidVersion,
	E extends SchemaOf<typeof Event>,
>(
	version: V,
	event: E,
) =>
	Schema.Struct({
		t: Schema.Literal("events"),
		version: Version(version),
		events: Schema.Array(event),
	});
