import { type Domain, ProjectId, ProjectVersion } from "@daw/core";
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Schema } from "effect";
import { ProjectSnapshotModel } from "./models";

export class ProjectSnapshotStore extends Effect.Service<ProjectSnapshotStore>()(
	"server/ProjectSnapshotStore",
	{
		effect: Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const getSnapshot = SqlSchema.findOne({
				Result: ProjectSnapshotModel,
				Request: Schema.Struct({
					projectId: ProjectId,
					version: ProjectVersion,
				}),
				execute: ({ projectId, version }) =>
					sql`SELECT version, data FROM events WHERE project_id = ${projectId} AND version > ${version} ORDER BY version ASC`,
			});

			const insertSnapshot = SqlSchema.single({
				Result: Schema.Void,
				Request: ProjectSnapshotModel.insert,
				execute: (request) => sql`insert into snapshots ${sql.insert(request)}`,
			});

			const load = (id: ProjectId, from?: ProjectVersion) =>
				getSnapshot({
					projectId: id,
					version: from ?? ProjectVersion.make(0),
				});

			const append = (project: Domain.Project) =>
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
