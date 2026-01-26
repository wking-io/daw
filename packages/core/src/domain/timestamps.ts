import { Schema } from "effect";

export const Timestamp = Schema.Struct({
	updatedAt: Schema.DateTimeUtc,
	createdAt: Schema.DateTimeUtc,
});
export type Timestamp = Schema.Schema.Type<typeof Timestamp>;
export const WithTimestamps = <A extends Schema.Schema.Any>(A: A) =>
	Schema.extend(A, Timestamp);
