import { ApiError, Ids, type Project, Versions } from "@daw/core";
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Option, Schema } from "effect";
import { ProjectSnapshotModel } from "./models";

export class ProjectSnapshotStore extends Effect.Service<ProjectSnapshotStore>()(
	"server/ProjectSnapshotStore",
	{
		effect: Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const getSnapshot = SqlSchema.findOne({
				Result: ProjectSnapshotModel,
				Request: Schema.Struct({
					projectId: Ids.ProjectId,
					version: Versions.ProjectVersion,
				}),
				execute: ({ projectId, version }) =>
					sql`SELECT version, data FROM events WHERE project_id = ${projectId} AND version > ${version} ORDER BY version ASC`,
			});

			const insertSnapshot = SqlSchema.single({
				Result: Schema.Void,
				Request: ProjectSnapshotModel.insert,
				execute: (request) => sql`insert into snapshots ${sql.insert(request)}`,
			});

			const load = (id: Ids.ProjectId, from?: Versions.ProjectVersion) =>
				getSnapshot({
					projectId: id,
					version: from ?? Versions.ProjectVersion.make(0),
				}).pipe(
					Effect.flatMap(
						Option.match({
							onNone: () =>
								Effect.fail(
									new ApiError.NotFound({
										detail: `Snapshot not found for project ${id}`,
										instance: `/api/projects/${id}`,
									}),
								),
							onSome: (snapshot) => Effect.succeed(snapshot),
						}),
					),
				);

			const append = (project: Project.Project) =>
				insertSnapshot({
					id: project.id,
					version: project.version,
					data: project,
				}).pipe(
					Effect.catchTags({
						NoSuchElementException: () => Effect.void,
					}),
				);

			return {
				load,
				append,
			};
		}),
	},
) {}
