import { Schema } from "effect";
import { OperationEntry, PatchBatch } from "./project";

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

export const OperationEvent = Schema.Struct({
	t: Schema.Literal("operation"),
	entry: OperationEntry,
});
export type OperationEvent = typeof OperationEvent.Type;

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

export const LocksEvent = Schema.Struct({
	t: Schema.Literal("locks"),
	locks: Schema.Array(
		Schema.Struct({
			resource: Schema.String,
			clientId: Schema.String,
			acquiredAt: Schema.Number,
		}),
	),
});
export type LocksEvent = typeof LocksEvent.Type;

export const Event = Schema.Union(
	ServerConnectedEvent,
	ServerHeartbeatEvent,
	OperationEvent,
	PatchEvent,
	PresenceEvent,
	LocksEvent,
);
export type Event = typeof Event.Type;
