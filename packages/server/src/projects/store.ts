import { type Events, type Ids, Project, Versions } from "@daw/core";
import { Effect } from "effect";
import { ProjectEventStore } from "./event-store";
import { ProjectSnapshotStore } from "./snapshot-store";

export class ProjectStore extends Effect.Service<ProjectStore>()(
	"ProjectStore",
	{
		effect: Effect.gen(function* () {
			const eventStore = yield* ProjectEventStore;
			const snapshotStore = yield* ProjectSnapshotStore;

			const evolve = (
				project: Project.Project,
				events: Events.EditorEvent[],
			) => {
				return events.reduce((s, event) => Project.evolve(s, event), project);
			};

			const load = (id: Ids.ProjectId, from?: Versions.ProjectVersion) =>
				Effect.gen(function* () {
					const snapshot = yield* snapshotStore.load(id, from);
					const events = yield* eventStore.load(id, snapshot.version);

					return evolve(
						snapshot.data,
						events.map((event) => event.data),
					);
				});

			const append = (project: Project.Project, events: Events.EditorEvent[]) =>
				Effect.gen(function* () {
					const results = Effect.all(
						events.map((event, idx) =>
							eventStore.append(
								project.id,
								Versions.add("ProjectVersion", project.version, 1 + idx),
								event,
							),
						),
					).pipe(Effect.flatMap(() => Effect.void));

					return results;
				});

			return { load, append };
		}),
		dependencies: [ProjectEventStore.Default, ProjectSnapshotStore.Default],
	},
) {}
