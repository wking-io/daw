import { ApiError, Commands, Ids, Project } from "@daw/core";
import { ProjectVersion } from "@daw/core/versions";
import { Tool, Toolkit } from "@effect/ai";
import { Effect, Schema } from "effect";
import { ProjectRepository } from "./repo";

export const CreateProjectTool = Tool.make("daw.project.create", {
	description: "Create a new project in the DAW",
	parameters: Commands.ProjectCreate.fields,
	success: Project.Project,
	failure: ApiError.ApiError,
	dependencies: [ProjectRepository],
});

export const DeleteProjectTool = Tool.make("daw.project.delete", {
	description: "Delete a project from the DAW",
	parameters: Schema.Struct({
		projectId: Ids.ProjectId,
	}).fields,
	success: Project.Project,
	failure: ApiError.ApiError,
	dependencies: [ProjectRepository],
});

export const ProjectToolkit = Toolkit.make(
	CreateProjectTool,
	DeleteProjectTool,
);
export const ProjectToolkitLive = ProjectToolkit.toLayer({
	[CreateProjectTool.name]: (params: Commands.ProjectCreate) =>
		Effect.gen(function* () {
			const repo = yield* ProjectRepository;
			const command = Commands.ProjectCreateCommand.make({
				id: Ids.generate("CommandId"),
				expectedVersion: ProjectVersion.make(0),
				actor: "agent",
				payload: params,
			});
			return yield* repo.create(command);
		}),
	[DeleteProjectTool.name]: (params: { projectId: Ids.ProjectId }) =>
		Effect.gen(function* () {
			const repo = yield* ProjectRepository;
			const project = yield* repo.get(params.projectId);
			const command = Commands.ProjectDeleteCommand.make({
				id: Ids.generate("CommandId"),
				expectedVersion: project.version,
				actor: "agent",
				payload: { t: "project.delete" },
			});
			return yield* repo.remove(params.projectId, command);
		}),
});
