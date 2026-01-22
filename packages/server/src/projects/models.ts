import { Domain, Events, ProjectId, ProjectVersion } from "@daw/core";
import { Model } from "@effect/sql";
import { Schema } from "effect";

export class ProjectSnapshotModel extends Model.Class<ProjectSnapshotModel>(
	"ProjectSnapshot",
)({
	id: Model.FieldOnly("select", "insert", "update")(ProjectId),
	version: Model.FieldOnly("select", "insert", "update")(ProjectVersion),
	data: Model.JsonFromString(Domain.Project),
	createdAt: Model.FieldOnly("select")(Schema.DateTimeUtcFromSelf),
}) {}

export type ProjectSnapshotRow = typeof ProjectSnapshotModel.Type;
export type ProjectSnapshotInsert = typeof ProjectSnapshotModel.insert.Type;

export class ProjectEventModel extends Model.Class<ProjectEventModel>(
	"ProjectEvent",
)({
	id: Model.FieldOnly("select", "insert", "update")(ProjectId),
	version: Model.FieldOnly("select", "insert", "update")(ProjectVersion),
	data: Model.JsonFromString(Events.EditorEvent),
	createdAt: Model.FieldOnly("select")(Schema.DateTimeUtcFromSelf),
}) {}

export type ProjectEventRow = typeof ProjectEventModel.Type;
export type ProjectEventInsert = typeof ProjectEventModel.insert.Type;
