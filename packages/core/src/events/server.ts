import { Schema } from "effect";

export const ServerHeartbeatEvent = Schema.Struct({
	t: Schema.Literal("server.heartbeat"),
	timestamp: Schema.Number,
});
export type ServerHeartbeatEvent = typeof ServerHeartbeatEvent.Type;

export const ServerEvent = Schema.Union(ServerHeartbeatEvent);
export type ServerEvent = typeof ServerEvent.Type;
