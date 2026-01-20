import { Schema } from "effect";
import { ProjectVersion } from "./commands";
import { EventBatch } from "./events";

/**
 * SSE Event Types
 *
 * Server-Sent Events for real-time updates from the DAW server.
 */

export const ServerConnectedEvent = Schema.Struct({
	t: Schema.Literal("server.connected"),
	serverVersion: ProjectVersion,
});
export type ServerConnectedEvent = typeof ServerConnectedEvent.Type;

export const ServerHeartbeatEvent = Schema.Struct({
	t: Schema.Literal("server.heartbeat"),
	timestamp: Schema.Number,
});
export type ServerHeartbeatEvent = typeof ServerHeartbeatEvent.Type;

export const EventBatchEvent = Schema.Struct({
	t: Schema.Literal("events"),
	batch: EventBatch,
});
export type EventBatchEvent = typeof EventBatchEvent.Type;

/** @deprecated Use EventBatchEvent instead */
export const PatchEvent = Schema.Struct({
	t: Schema.Literal("patch"),
	batch: EventBatch,
});
/** @deprecated Use EventBatchEvent instead */
export type PatchEvent = typeof PatchEvent.Type;

export const SSEEvent = Schema.Union(
	ServerConnectedEvent,
	ServerHeartbeatEvent,
	EventBatchEvent,
);
export type SSEEvent = typeof SSEEvent.Type;

/** @deprecated Use SSEEvent instead */
export const Event = SSEEvent;
/** @deprecated Use SSEEvent instead */
export type Event = SSEEvent;
