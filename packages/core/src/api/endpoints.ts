import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiGroup,
	HttpApiMiddleware,
	HttpApiSchema,
	HttpApiSecurity,
} from "@effect/platform";
import { Schema } from "effect";
import * as Commands from "../commands";
import { Project } from "../domain";
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

const projectGroup = HttpApiGroup.make("project")
	.add(
		HttpApiEndpoint.get("list", "/").addSuccess(
			Schema.Array(Project.ProjectSummary),
		),
	)
	.add(
		HttpApiEndpoint.post("create", "/")
			.setPayload(Commands.ProjectCreateCommand)
			.addSuccess(Project.ProjectWithTimestamps),
	)
	.add(
		HttpApiEndpoint.get("get", "/:projectId")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.addSuccess(Project.ProjectWithTimestamps)
			.addError(ApiError.NotFound),
	)
	.add(
		HttpApiEndpoint.post("edit", "/:projectId/edit")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.setPayload(Commands.EditorCommand)
			.addSuccess(Project.ProjectWithTimestamps)
			.addError(ApiError.NotFound),
	)
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
			.addError(ApiError.NotFound),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:projectId")
			.setPath(Schema.Struct({ projectId: ProjectId }))
			.addSuccess(Schema.Struct({ deleted: Schema.Boolean }))
			.addError(ApiError.NotFound),
	)
	.addError(ApiError.Unauthorized)
	.middleware(Authorization)
	.prefix("/projects");

export const Api = HttpApi.make("api")
	.add(healthGroup)
	.add(projectGroup)
	.addError(ApiError.InternalServerError)
	.addError(ApiError.BadRequest)
	.prefix("/api");
