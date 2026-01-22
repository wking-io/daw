import { Schema } from "effect";
import { type ValidVersion, Version } from "../versions";
import * as Editor from "./editor";
import { ServerEvent } from "./server";

export * from "./editor";

export const Event = Schema.Union(Editor.EditorEvent);
export type Event = typeof Event.Type;

// Schema whose Type is a subtype of Event
type EventSchema<S extends Schema.Schema.Any = Schema.Schema.Any> =
	S extends Schema.Schema.Any
		? Schema.Schema.Type<S> extends Event
			? S
			: never
		: never;

/** Batch of events at a specific version */
export const EventBatch = <V extends ValidVersion, E extends EventSchema>(
	version: V,
	event: E,
) =>
	Schema.Struct({
		t: Schema.Literal("events"),
		version: Version(version),
		events: Schema.Array(event),
	});

export const Events = Schema.Union(ServerEvent, Editor.EditorEventBatch);
export type Events = typeof Events.Type;
