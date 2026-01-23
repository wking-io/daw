import { Events, Ids, Project, Versions } from "@daw/core";
import { Model } from "@effect/sql";
import { Schema } from "effect";

export class ProjectSummaryModel extends Model.Class<ProjectSummaryModel>(
	"ProjectListItem",
)({
	id: Model.FieldOnly("select", "insert", "update")(Ids.ProjectId),
	name: Schema.String,
	version: Versions.ProjectVersion,
	createdAt: Model.FieldOnly("select")(Schema.DateTimeUtc),
	updatedAt: Model.FieldOnly("select")(Schema.DateTimeUtc),
}) {}

export type ProjectSummaryRow = typeof ProjectSummaryModel.Type;

export class ProjectSnapshotModel extends Model.Class<ProjectSnapshotModel>(
	"ProjectSnapshot",
)({
	id: Model.FieldOnly("select", "insert", "update")(Ids.ProjectId),
	name: Model.FieldOnly("select", "insert", "update")(Schema.String),
	version: Model.FieldOnly(
		"select",
		"insert",
		"update",
	)(Versions.ProjectVersion),
	data: Model.JsonFromString(Project.Project),
	createdAt: Model.FieldOnly("select")(Schema.DateTimeUtc),
	updatedAt: Model.FieldOnly("select")(Schema.DateTimeUtc),
}) {}

export type ProjectSnapshotRow = typeof ProjectSnapshotModel.Type;
export type ProjectSnapshotInsert = typeof ProjectSnapshotModel.insert.Type;

export class ProjectEventModel extends Model.Class<ProjectEventModel>(
	"ProjectEvent",
)({
	id: Model.FieldOnly("select", "insert", "update")(Ids.ProjectId),
	version: Model.FieldOnly(
		"select",
		"insert",
		"update",
	)(Versions.ProjectVersion),
	data: Model.JsonFromString(Events.EditorEvent),
	createdAt: Model.FieldOnly("select")(Schema.DateTimeUtc),
	updatedAt: Model.FieldOnly("select")(Schema.DateTimeUtc),
}) {}

export type ProjectEventRow = typeof ProjectEventModel.Type;
export type ProjectEventInsert = typeof ProjectEventModel.insert.Type;
