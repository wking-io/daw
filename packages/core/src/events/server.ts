import { Schema } from "effect";

export const ServerHeartbeatEvent = Schema.Struct({
	t: Schema.Literal("server.heartbeat"),
	timestamp: Schema.Number,
});
export type ServerHeartbeatEvent = Schema.Schema.Type<
	typeof ServerHeartbeatEvent
>;

export const ServerEvent = Schema.Union(ServerHeartbeatEvent);
export type ServerEvent = Schema.Schema.Type<typeof ServerEvent>;
