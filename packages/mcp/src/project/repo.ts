import type { Commands } from "@daw/core";
import { ApiError } from "@daw/core";
import { Effect } from "effect";
import { ApiClient } from "../api-client";

export class ProjectRepository extends Effect.Service<ProjectRepository>()(
	"mcp/ProjectRepository",
	{
		effect: Effect.gen(function* () {
			const api = yield* ApiClient;

			const list = () => api.project.list();

			const create = (project: Commands.ProjectCreate) =>
				api.project.create({ payload: project }).pipe(
					Effect.catchTags({
						HttpApiDecodeError: (error) =>
							Effect.fail(
								new ApiError.BadRequest({
									detail: error.message,
								}),
							),
						RequestError: (error) =>
							Effect.fail(
								new ApiError.BadRequest({
									detail: error.message,
								}),
							),
						ResponseError: (error) =>
							Effect.fail(
								new ApiError.NotAcceptable({
									detail: error.message,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								new ApiError.BadRequest({
									detail: error.message,
								}),
							),
					}),
				);

			return {
				list,
				create,
			};
		}),
		dependencies: [ApiClient.Default],
	},
) {}
