import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiError,
	HttpApiGroup,
	HttpApiMiddleware,
	HttpApiSchema,
	HttpApiSecurity,
} from "@effect/platform";
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
const healthGroup = HttpApiGroup.make("health")
	.add(HttpApiEndpoint.get("health", "/").addSuccess(HealthResponse))
	.prefix("/health");

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
	"Authorization",
	{
		failure: HttpApiError.Unauthorized,
		security: { token: HttpApiSecurity.bearer },
	},
) {}

const projectGroup = HttpApiGroup.make("project")
	.add(
		HttpApiEndpoint.get("getSnapshot", "/snapshot").addSuccess(
			Project.Snapshot,
		),
	)
	.add(
		HttpApiEndpoint.post("postOperations", "/operations")
			.setPayload(Project.Submit)
			.addSuccess(Project.SubmitResult),
	)
	.add(
		HttpApiEndpoint.get("getOperations", "/operations")
			.setUrlParams(
				Schema.Struct({
					fromVersion: Schema.optional(Schema.NumberFromString),
				}),
			)
			.addSuccess(Project.OperationsResponse),
	)
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/project");

const eventsGroup = HttpApiGroup.make("events")
	.add(
		HttpApiEndpoint.get("events", "/")
			.setUrlParams(
				Schema.Struct({
					fromVersion: Schema.optional(Schema.NumberFromString),
				}),
			)
			.addSuccess(
				Schema.String.pipe(
					HttpApiSchema.withEncoding({
						kind: "Text",
						contentType: "text/event-stream",
					}),
				),
			),
	)
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/events");

export const Api = HttpApi.make("api")
	.add(healthGroup)
	.add(projectGroup)
	.add(eventsGroup)
	.prefix("/api");
