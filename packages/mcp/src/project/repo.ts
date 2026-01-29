import * as ApiError from "@daw/core/api/errors";
import type {
	ProjectCreateCommand,
	ProjectDeleteCommand,
} from "@daw/core/commands/command";
import type * as Ids from "@daw/core/ids";
import { Effect } from "effect";
import { ApiClient } from "../api-client";

const mapError = (error: { _tag: string; message: string }) => {
	switch (error._tag) {
		case "HttpApiDecodeError":
		case "RequestError":
		case "ParseError":
			return new ApiError.BadRequest({ detail: error.message });
		case "ResponseError":
			return new ApiError.NotAcceptable({ detail: error.message });
		default:
			return new ApiError.InternalServerError({ detail: error.message });
	}
};

export class ProjectRepository extends Effect.Service<ProjectRepository>()(
	"mcp/ProjectRepository",
	{
		effect: Effect.gen(function* () {
			const api = yield* ApiClient;

			const list = () => api.project.list();

			const get = (projectId: Ids.ProjectId) =>
				api.project
					.get({ path: { projectId } })
					.pipe(Effect.mapError(mapError));

			const create = (payload: ProjectCreateCommand) =>
				api.project.create({ payload }).pipe(Effect.mapError(mapError));

			const remove = (
				projectId: Ids.ProjectId,
				payload: ProjectDeleteCommand,
			) =>
				api.project
					.delete({ path: { projectId }, payload })
					.pipe(Effect.mapError(mapError));

			return {
				list,
				get,
				create,
				remove,
			};
		}),
		dependencies: [ApiClient.Default],
	},
) {}
