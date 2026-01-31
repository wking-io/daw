import { Schema } from "effect";

export const ServerHeartbeatEvent = Schema.Struct({
	t: Schema.Literal("server.heartbeat"),
	timestamp: Schema.Number,
});
export type ServerHeartbeatEvent = Schema.Schema.Type<
	typeof ServerHeartbeatEvent
>;

export const ServerSubscribedEvent = Schema.Struct({
	t: Schema.Literal("server.subscribed"),
	timestamp: Schema.Number,
});
export type ServerSubscribedEvent = Schema.Schema.Type<
	typeof ServerSubscribedEvent
>;

export const ServerEvent = Schema.Union(
	ServerHeartbeatEvent,
	ServerSubscribedEvent,
);
export type ServerEvent = Schema.Schema.Type<typeof ServerEvent>;
