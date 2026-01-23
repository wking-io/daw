import { Schema } from "effect";
import { EditorEventBatch } from "./editor";
import { ProjectSubscribedEvent } from "./project";
import { ServerEvent } from "./server";

export * from "./editor";
export * from "./event-batch";
export { ProjectSubscribedEvent } from "./project";
export * from "./server";

export const EventResponses = Schema.Union(
	EditorEventBatch,
	ServerEvent,
	ProjectSubscribedEvent,
);
export type EventResponses = Schema.Schema.Type<typeof EventResponses>;
