import { type Events, type Ids, Project, Versions } from "@daw/core";
import type { SqlError } from "@effect/sql/SqlError";
import { Effect } from "effect";
import type { NoSuchElementException } from "effect/Cause";
import type { ParseError } from "effect/ParseResult";
import { ProjectEventStore } from "./event-store";
import { ProjectSnapshotStore } from "./snapshot-store";

export class ProjectStore extends Effect.Service<ProjectStore>()(
	"ProjectStore",
	{
		effect: Effect.gen(function* () {
			const eventStore = yield* ProjectEventStore;
			const snapshotStore = yield* ProjectSnapshotStore;
			const CHANGE_THRESHOLD = 20; // TODO: Make this configurable

			const evolve = (
				project: Project.Project,
				events: ReadonlyArray<Events.EditorEvent>,
			) => {
				return events.reduce((s, event) => Project.evolve(s, event), project);
			};

			const load = (id: Ids.ProjectId) =>
				Effect.gen(function* () {
					const [snapshot, createdAt] = yield* Effect.all([
						snapshotStore.load(id),
						snapshotStore
							.load(id, "ASC")
							.pipe(Effect.map((snapshot) => snapshot.createdAt)),
					]);

					const events = yield* eventStore
						.load(id, snapshot.version)
						.pipe(Effect.map((events) => events.map((event) => event.data)));

					const project = evolve(snapshot.data, events);
					return {
						...project,
						updatedAt: snapshot.createdAt,
						createdAt,
					};
				});

			const append = (
				project: Project.ProjectWithTimestamps,
				events: ReadonlyArray<Events.EditorEvent>,
			): Effect.Effect<
				Project.ProjectWithTimestamps,
				SqlError | ParseError | NoSuchElementException,
				never
			> =>
				Effect.gen(function* () {
					const version = yield* Effect.all(
						events.map((event, idx) =>
							eventStore.append(
								project.id,
								Versions.add("ProjectVersion", project.version, 1 + idx),
								event,
							),
						),
					).pipe(Effect.map((versions) => versions.at(-1) ?? project.version));

					const evolved = evolve(project, events);
					const updatedProject = { ...evolved, version };

					if (
						project.version === 0 ||
						version - project.version > CHANGE_THRESHOLD
					) {
						const saved = yield* snapshotStore.append(updatedProject);
						return {
							...saved.data,
							createdAt: project.createdAt,
							updatedAt: saved.createdAt,
						};
					}

					return {
						...updatedProject,
						createdAt: project.createdAt,
						updatedAt: project.updatedAt,
					};
				});

			return { load, append };
		}),
		dependencies: [ProjectEventStore.Default, ProjectSnapshotStore.Default],
	},
) {}
