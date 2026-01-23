import { ApiError, Commands, Ids, Project } from "@daw/core";
import { ProjectVersion } from "@daw/core/versions";
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
			const CreateCommand = Commands.ProjectCreateCommand.make({
				id: Ids.generate("CommandId"),
				expectedVersion: ProjectVersion.make(0),
				actor: "agent",
				payload: params,
			});
			return yield* repo.create(CreateCommand);
		}),
});
