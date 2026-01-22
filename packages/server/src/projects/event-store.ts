import { type Events, ProjectId, ProjectVersion } from "@daw/core";
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Schema } from "effect";
import { ProjectEventModel } from "./models";

export class ProjectEventStore extends Effect.Service<ProjectEventStore>()(
	"server/ProjectEventStore",
	{
		effect: Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const listEvents = SqlSchema.findAll({
				Result: ProjectEventModel,
				Request: Schema.Struct({
					projectId: ProjectId,
					version: ProjectVersion,
				}),
				execute: ({ projectId, version }) =>
					sql`SELECT version, data FROM events WHERE project_id = ${projectId} AND version > ${version} ORDER BY version ASC`,
			});

			const insertEvent = SqlSchema.single({
				Result: Schema.Void,
				Request: ProjectEventModel.insert,
				execute: (request) => sql`insert into events ${sql.insert(request)}`,
			});

			const load = (id: ProjectId, from?: ProjectVersion) =>
				listEvents({
					projectId: id,
					version: from ?? ProjectVersion.make(0),
				});

			const append = (
				id: ProjectId,
				version: ProjectVersion,
				event: Events.EditorEvent,
			) =>
				insertEvent({ id, version, data: event }).pipe(
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
