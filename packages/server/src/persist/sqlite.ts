import { Domain, Events, ProjectId } from "@daw/core";
import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Option, Schema } from "effect";

/**
 * Schema for snapshot rows stored in the database
 * The data column contains JSON-encoded snapshot data
 */
const SnapshotRowSchema = Schema.Struct({
	version: Schema.Number,
	data: Schema.String,
});

/**
 * Schema for event rows stored in the database
 * The data column contains JSON-encoded event batch data
 */
const EventRowSchema = Schema.Struct({
	version: Schema.Number,
	data: Schema.String,
});

/**
 * Schema for project rows in the database
 */
const ProjectRowSchema = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	bpm: Schema.Number,
	time_sig_numerator: Schema.Number,
	time_sig_denominator: Schema.Number,
	created_at: Schema.String,
	updated_at: Schema.String,
});

export class Persistence extends Effect.Service<Persistence>()(
	"server/Persistence",
	{
		effect: Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			// Decoders for JSON data
			const decodeSnapshot = Schema.decodeUnknown(Events.Snapshot);
			const decodeEventBatch = Schema.decodeUnknown(Events.EventBatch);
			const decodeProject = Schema.decodeUnknown(Domain.Project);

			/**
			 * Find the latest snapshot for a project
			 * Returns Option.none() if no snapshot exists
			 */
			const findSnapshotRaw = SqlSchema.findOne({
				Result: SnapshotRowSchema,
				Request: Schema.Struct({ projectId: ProjectId }),
				execute: ({ projectId }) =>
					sql`SELECT version, data FROM snapshots WHERE project_id = ${projectId} ORDER BY version DESC LIMIT 1`,
			});

			const findSnapshot = (request: { projectId: typeof ProjectId.Type }) =>
				Effect.flatMap(findSnapshotRaw(request), (optRow) =>
					Option.match(optRow, {
						onNone: () => Effect.succeed(Option.none<Events.Snapshot>()),
						onSome: (row) =>
							Effect.map(decodeSnapshot(JSON.parse(row.data)), Option.some),
					}),
				);

			/**
			 * Create a new snapshot for a project
			 * Returns the created snapshot
			 */
			const createSnapshotRaw = SqlSchema.single({
				Result: SnapshotRowSchema,
				Request: Schema.Struct({
					project_id: ProjectId,
					version: Schema.Number,
					data: Schema.String,
				}),
				execute: (request) =>
					sql`INSERT INTO snapshots ${sql.insert(request)} RETURNING version, data`,
			});

			const createSnapshot = (request: {
				project_id: typeof ProjectId.Type;
				version: number;
				data: string;
			}) =>
				Effect.flatMap(createSnapshotRaw(request), (row) =>
					decodeSnapshot(JSON.parse(row.data)),
				);

			/**
			 * List all event batches for a project after a given version
			 * Returns events in ascending version order
			 */
			const listEventsRaw = SqlSchema.findAll({
				Result: EventRowSchema,
				Request: Schema.Struct({
					projectId: Schema.String,
					version: Schema.Number,
				}),
				execute: ({ projectId, version }) =>
					sql`SELECT version, data FROM events WHERE project_id = ${projectId} AND version > ${version} ORDER BY version ASC`,
			});

			const listEvents = (request: { projectId: string; version: number }) =>
				Effect.flatMap(listEventsRaw(request), (rows) =>
					Effect.all(rows.map((row) => decodeEventBatch(JSON.parse(row.data)))),
				);

			/**
			 * Create a new event batch for a project
			 * Returns void on success
			 */
			const createEvent = SqlSchema.void({
				Request: Schema.Struct({
					project_id: ProjectId,
					version: Schema.Number,
					data: Schema.String,
				}),
				execute: (request) => sql`INSERT INTO events ${sql.insert(request)}`,
			});

			/**
			 * List all projects
			 * Returns projects in descending creation order
			 */
			const listProjectsRaw = SqlSchema.findAll({
				Result: ProjectRowSchema,
				Request: Schema.Void,
				execute: () =>
					sql`SELECT id, name, bpm, time_sig_numerator, time_sig_denominator, created_at, updated_at FROM projects ORDER BY created_at DESC`,
			});

			const listProjects = () =>
				Effect.flatMap(listProjectsRaw(), (rows) =>
					Effect.all(
						rows.map((row) =>
							decodeProject({
								id: row.id,
								name: row.name,
								bpm: row.bpm,
								timeSignature: {
									numerator: row.time_sig_numerator,
									denominator: row.time_sig_denominator,
								},
								createdAt: new Date(row.created_at).getTime(),
								updatedAt: new Date(row.updated_at).getTime(),
							}),
						),
					),
				);

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
