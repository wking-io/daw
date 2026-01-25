import { ApiError, type Events, type Ids, Project, Versions } from "@daw/core";
import type { SqlError } from "@effect/sql/SqlError";
import { Effect, Option } from "effect";
import type { NoSuchElementException } from "effect/Cause";
import type { ParseError } from "effect/ParseResult";
import { ProjectEventStore } from "./event-store";
import { ProjectSnapshotStore } from "./snapshot-store";

const isDeleted = (project: Project.Project): boolean =>
	Option.isSome(project.deletedAt);

const containsDeletion = (events: ReadonlyArray<Events.EditorEvent>): boolean =>
	events.some((e) => e.t === "project.deleted");

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

					if (isDeleted(project)) {
						return yield* Effect.fail(
							new ApiError.Gone({
								detail: `Project ${id} has been deleted`,
								instance: `/api/projects/${id}`,
							}),
						);
					}

					return {
						...project,
						updatedAt: snapshot.createdAt,
						createdAt,
					};
				});

			const create = (
				event: Events.ProjectCreated,
			): Effect.Effect<
				Project.ProjectWithTimestamps,
				SqlError | ParseError | NoSuchElementException,
				never
			> =>
				Effect.gen(function* () {
					const [saved] = yield* Effect.all([
						snapshotStore.append(event.project),
						eventStore.append(event.project.id, event.project.version, event),
					]);
					return {
						...saved.data,
						createdAt: saved.createdAt,
						updatedAt: saved.createdAt,
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

					const shouldSnapshot =
						project.version === 0 ||
						version - project.version > CHANGE_THRESHOLD ||
						containsDeletion(events);

					if (shouldSnapshot) {
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

			return { load, append, create };
		}),
		dependencies: [ProjectEventStore.Default, ProjectSnapshotStore.Default],
	},
) {}
