import { ApiError, Ids, type Project } from "@daw/core";
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Option, Schema } from "effect";
import { ProjectSnapshotModel } from "./models";

export class ProjectSnapshotStore extends Effect.Service<ProjectSnapshotStore>()(
	"server/ProjectSnapshotStore",
	{
		effect: Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const getSnapshotAsc = SqlSchema.findOne({
				Result: ProjectSnapshotModel,
				Request: Schema.Struct({ id: Ids.ProjectId }),
				execute: ({ id }) =>
					sql`SELECT * FROM snapshots WHERE id = ${id} ORDER BY version ASC LIMIT 1`,
			});

			const getSnapshotDesc = SqlSchema.findOne({
				Result: ProjectSnapshotModel,
				Request: Schema.Struct({ id: Ids.ProjectId }),
				execute: ({ id }) =>
					sql`SELECT * FROM snapshots WHERE id = ${id} ORDER BY version DESC LIMIT 1`,
			});

			const insertSnapshot = SqlSchema.single({
				Result: ProjectSnapshotModel,
				Request: ProjectSnapshotModel.insert,
				execute: (request) =>
					sql`insert into snapshots ${sql.insert(request)} RETURNING *`,
			});

			const load = (id: Ids.ProjectId, order: "ASC" | "DESC" = "DESC") => {
				const getSnapshot = order === "ASC" ? getSnapshotAsc : getSnapshotDesc;
				return getSnapshot({ id }).pipe(
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
			};

			const append = (project: Project.Project) =>
				insertSnapshot({
					id: project.id,
					name: project.name,
					version: project.version,
					data: project,
				});

			return {
				load,
				append,
			};
		}),
	},
) {}
