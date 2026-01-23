import { ApiError, Commands, Project } from "@daw/core";
import { Tool, Toolkit } from "@effect/ai";
import { Effect } from "effect";
import { ProjectRepository } from "./repo";

export const CreateProjectTool = Tool.make("daw.project.create", {
	description: "Create a new track in the DAW project",
	parameters: Commands.ProjectCreate.fields,
	success: Project.Project,
	failure: ApiError.ApiError,
	dependencies: [ProjectRepository],
});

export const ProjectToolkit = Toolkit.make(CreateProjectTool);
export const ProjectToolkitLive = ProjectToolkit.toLayer({
	[CreateProjectTool.name]: (params: Commands.ProjectCreate) =>
		Effect.gen(function* () {
			const repo = yield* ProjectRepository;
			return yield* repo.create(params);
		}),
});
