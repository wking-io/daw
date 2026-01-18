import { Schema } from "effect";
import { OpEntry, PatchBatch } from "./project";

/**
 * SSE Event Types
 *
 * Server-Sent Events for real-time updates from the DAW server.
 */

export const ServerConnectedEvent = Schema.Struct({
	t: Schema.Literal("server.connected"),
	serverVersion: Schema.Number,
});
export type ServerConnectedEvent = typeof ServerConnectedEvent.Type;

export const ServerHeartbeatEvent = Schema.Struct({
	t: Schema.Literal("server.heartbeat"),
	timestamp: Schema.Number,
});
export type ServerHeartbeatEvent = typeof ServerHeartbeatEvent.Type;

export const OpEvent = Schema.Struct({
	t: Schema.Literal("op"),
	entry: OpEntry,
});
export type OpEvent = typeof OpEvent.Type;

export const PatchEvent = Schema.Struct({
	t: Schema.Literal("patch"),
	batch: PatchBatch,
});
export type PatchEvent = typeof PatchEvent.Type;

export const PresenceEvent = Schema.Struct({
	t: Schema.Literal("presence"),
	clients: Schema.Array(Schema.String),
});
export type PresenceEvent = typeof PresenceEvent.Type;

export const LockEvent = Schema.Struct({
	t: Schema.Literal("locks"),
	locks: Schema.Array(
		Schema.Struct({
			resource: Schema.String,
			clientId: Schema.String,
			acquiredAt: Schema.Number,
		}),
	),
});
export type LockEvent = typeof LockEvent.Type;

export const SSEEvent = Schema.Union(
	ServerConnectedEvent,
	ServerHeartbeatEvent,
	OpEvent,
	PatchEvent,
	PresenceEvent,
	LockEvent,
);
export type SSEEvent = typeof SSEEvent.Type;
