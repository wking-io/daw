import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Schema } from "effect";
import { ProjectSummaryModel } from "./models";

export class ProjectLister extends Effect.Service<ProjectLister>()("server/ProjectLister", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const list = SqlSchema.findAll({
      Result: ProjectSummaryModel,
      Request: Schema.Void,
      execute: () =>
        sql`SELECT id, name, version, createdAt, updatedAt FROM snapshots ORDER BY updatedAt DESC`,
    });

    return { list };
  }),
}) {}
