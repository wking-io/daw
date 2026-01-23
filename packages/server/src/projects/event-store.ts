import { type Events, Ids, Versions } from "@daw/core";
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
					id: Ids.ProjectId,
					version: Versions.ProjectVersion,
				}),
				execute: ({ id, version }) =>
					sql`SELECT * FROM events WHERE id = ${id} AND version > ${version} ORDER BY version ASC`,
			});

			const insertEvent = SqlSchema.single({
				Result: Schema.Void,
				Request: ProjectEventModel.insert,
				execute: (request) => sql`insert into events ${sql.insert(request)}`,
			});

			const load = (id: Ids.ProjectId, from?: Versions.ProjectVersion) =>
				listEvents({
					id,
					version: from ?? Versions.ProjectVersion.make(0),
				});

			const append = (
				id: Ids.ProjectId,
				version: Versions.ProjectVersion,
				event: Events.EditorEvent,
			) =>
				insertEvent({ id, version, data: event }).pipe(
					Effect.map(() => version),
					Effect.catchTags({
						NoSuchElementException: () => Effect.succeed(version),
					}),
				);

			return {
				load,
				append,
			};
		}),
	},
) {}
