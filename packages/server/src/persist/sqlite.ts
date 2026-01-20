import { Domain, Events, ProjectId } from "@daw/contract";
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Schema } from "effect";

export class Persistence extends Effect.Service<Persistence>()(
	"server/Persistence",
	{
		effect: Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const findSnapshot = SqlSchema.findOne({
				Result: Events.Snapshot,
				Request: Schema.Struct({ projectId: ProjectId }),
				execute: ({ projectId }) =>
					sql`SELECT version, data FROM snapshots WHERE ${sql`project_id = ${projectId}`} ORDER BY version DESC LIMIT 1`,
			});

			const createSnapshot = SqlSchema.single({
				Result: Events.Snapshot,
				Request: Schema.Struct({
					projectId: ProjectId,
					version: Schema.Number,
					data: Schema.String,
				}),
				execute: (request) =>
					sql`INSERT INTO snapshots ${sql.insert(request)} RETURNING *`,
			});

			const listEvents = SqlSchema.findAll({
				Result: Events.EventBatch,
				Request: Schema.Struct({
					projectId: Schema.String,
					version: Schema.Number,
				}),
				execute: ({ projectId, version }) =>
					sql`SELECT version, data FROM events WHERE ${sql.and([sql`project_id = ${projectId}`, sql`version > ${version}`])} ORDER BY version ASC`,
			});

			const createEvent = SqlSchema.single({
				Result: Schema.Void,
				Request: Schema.Struct({
					projectId: ProjectId,
					version: Schema.Number,
					data: Schema.String,
				}),
				execute: (request) =>
					sql`INSERT INTO events ${sql.insert(request)} RETURNING *`,
			});

			const listProjects = SqlSchema.findAll({
				Result: Domain.Project,
				Request: Schema.Void,
				execute: () =>
					sql`SELECT id, name, created_at, updated_at, bpm, time_signature FROM projects ORDER BY created_at DESC`,
			});

			return {
				findSnapshot,
				createSnapshot,
				listEvents,
				createEvent,
				listProjects,
			};
		}),
		dependencies: [],
	},
) {}
