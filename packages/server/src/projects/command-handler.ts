import { type Commands, type Ids, Project } from "@daw/core";
import { Effect } from "effect";
import { ProjectStore } from "./store";

export class ProjectCommandHandler extends Effect.Service<ProjectCommandHandler>()(
	"server/ProjectCommandHandler",
	{
		effect: Effect.gen(function* () {
			const projectStore = yield* ProjectStore;

			const create = (command: Commands.ProjectCreateCommand) =>
				Effect.gen(function* () {
					const event = Project.create(command.payload);
					return yield* projectStore.create(event);
				});

			const execute = (
				projectId: Ids.ProjectId,
				command: Commands.EditorCommand,
			) =>
				Effect.gen(function* () {
					const project = yield* projectStore.load(projectId);
					const event = Project.decide(project, command.payload);
					return yield* projectStore.append(project, event);
				});

			return { create, execute };
		}),
		dependencies: [ProjectStore.Default],
	},
) {}
