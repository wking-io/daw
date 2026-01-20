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
import * as Commands from "./commands";
import * as Domain from "./domain";
import * as Events from "./events";
import { ProjectId } from "./ids";

/**
 * Health check response schema
 */
export const HealthResponse = Schema.Struct({
	healthy: Schema.Boolean,
	version: Schema.String,
});
export type HealthResponse = typeof HealthResponse.Type;

/**
 * Authorization middleware
 */
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
	"Authorization",
	{
		failure: HttpApiError.Unauthorized,
		security: { token: HttpApiSecurity.bearer },
	},
) {}

/**
 * Health check endpoint group
 */
const healthGroup = HttpApiGroup.make("health")
	.add(HttpApiEndpoint.get("health", "/").addSuccess(HealthResponse))
	.prefix("/health");

/**
 * Projects list endpoint group (for listing/creating projects)
 */
const projectsGroup = HttpApiGroup.make("projects")
	.add(
		HttpApiEndpoint.get("listProjects", "/").addSuccess(
			Schema.Array(Domain.Project),
		),
	)
	.add(
		HttpApiEndpoint.post("createProject", "/")
			.setPayload(Commands.ProjectCreate)
			.addSuccess(Domain.Project),
	)
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/projects");

/**
 * Single project endpoint group (operations on a specific project)
 */
const projectGroup = HttpApiGroup.make("project")
	.add(
		HttpApiEndpoint.get("getSnapshot", "/:projectId/snapshot")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.addSuccess(Events.Snapshot)
			.addError(HttpApiError.NotFound),
	)
	.add(
		HttpApiEndpoint.post("executeCommand", "/:projectId/commands")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.setPayload(Commands.Command)
			.addSuccess(Events.CommandResult)
			.addError(HttpApiError.NotFound),
	)
	.add(
		HttpApiEndpoint.get("getEvents", "/:projectId/events")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.setUrlParams(
				Schema.Struct({
					fromVersion: Schema.optional(Schema.NumberFromString),
				}),
			)
			.addSuccess(Schema.Array(Events.EventBatch))
			.addError(HttpApiError.NotFound),
	)
	.add(
		HttpApiEndpoint.del("deleteProject", "/:projectId")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.addSuccess(Schema.Struct({ deleted: Schema.Boolean }))
			.addError(HttpApiError.NotFound),
	)
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/projects");

/**
 * SSE endpoint group (Server-Sent Events for real-time updates)
 */
const sseGroup = HttpApiGroup.make("sse")
	.add(
		HttpApiEndpoint.get("subscribe", "/:projectId/subscribe")
			.setPath(Schema.Struct({ projectId: ProjectId }))
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
			)
			.addError(HttpApiError.NotFound),
	)
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/projects");

export const Api = HttpApi.make("api")
	.add(healthGroup)
	.add(projectsGroup)
	.add(projectGroup)
	.add(sseGroup)
	.prefix("/api");
