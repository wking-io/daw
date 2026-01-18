import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import * as Project from "./project";

/**
 * Health check response schema
 */
export const HealthResponse = Schema.Struct({
	healthy: Schema.Boolean,
	version: Schema.String,
});
export type HealthResponse = typeof HealthResponse.Type;

/**
 * DAW API endpoints group
 */
export class DawApi extends HttpApiGroup.make("daw")
	.add(HttpApiEndpoint.get("health", "/health").addSuccess(HealthResponse))
	.add(
		HttpApiEndpoint.get("snapshot", "/snapshot").addSuccess(Project.Snapshot),
	)
	.add(
		HttpApiEndpoint.post("submitOp", "/submitOp")
			.setPayload(Project.Submit)
			.addSuccess(Project.SubmitResult),
	)
	.add(
		HttpApiEndpoint.get("ops", "/ops")
			.setUrlParams(
				Schema.Struct({
					fromVersion: Schema.optional(Schema.NumberFromString),
				}),
			)
			.addSuccess(Project.OpsResponse),
	) {}

/**
 * Complete DAW HTTP API
 */
export class Api extends HttpApi.make("daw-api").add(DawApi) {}
