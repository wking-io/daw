import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiGroup,
	HttpApiMiddleware,
	HttpApiSchema,
	HttpApiSecurity,
} from "@effect/platform";
import { Schema } from "effect";
import {
	ProjectCreateCommand,
	ProjectDeleteCommand,
} from "../commands/command";
import { EditorCommand } from "../commands/editor-ops";
import * as Project from "../domain/project";
import { ProjectId } from "../ids";
import * as ApiError from "./errors";

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
		failure: ApiError.Unauthorized,
		security: { token: HttpApiSecurity.bearer },
	},
) {}

/**
 * Health check endpoint group
 */
const healthGroup = HttpApiGroup.make("health")
	.add(HttpApiEndpoint.get("health", "/").addSuccess(HealthResponse))
	.prefix("/health");

const eventsGroup = HttpApiGroup.make("events")
	.add(
		HttpApiEndpoint.get("subscribe", "/subscribe")
			.setUrlParams(
				Schema.Struct({
					fromVersion: Schema.optional(Schema.NumberFromString),
					projectId: Schema.optional(ProjectId),
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
	.addError(ApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/events");

const projectGroup = HttpApiGroup.make("project")
	.add(
		HttpApiEndpoint.get("list", "/").addSuccess(
			Schema.Array(Project.ProjectSummary),
		),
	)
	.add(
		HttpApiEndpoint.post("create", "/")
			.setPayload(ProjectCreateCommand)
			.addSuccess(Project.ProjectWithTimestamps),
	)
	.add(
		HttpApiEndpoint.get("get", "/:projectId")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.addSuccess(Project.ProjectWithTimestamps)
			.addError(ApiError.NotFound)
			.addError(ApiError.Gone),
	)
	.add(
		HttpApiEndpoint.post("edit", "/:projectId/edit")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.setPayload(EditorCommand)
			.addSuccess(Project.ProjectWithTimestamps)
			.addError(ApiError.NotFound),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:projectId")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.setPayload(ProjectDeleteCommand)
			.addSuccess(Project.ProjectWithTimestamps)
			.addError(ApiError.NotFound),
	)
	.addError(ApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/projects");

export const Api = HttpApi.make("api")
	.add(healthGroup)
	.add(eventsGroup)
	.add(projectGroup)
	.addError(ApiError.InternalServerError)
	.addError(ApiError.BadRequest)
	.prefix("/api");
