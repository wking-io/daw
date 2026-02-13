import { Schema } from "effect";
import { AutomationLaneId, AutomationPointId, ProjectId, TrackId } from "../ids";
import * as QN from "../lib/qn";

export const AutomationCurve = Schema.Literal("linear", "expo", "log", "hold");
export type AutomationCurve = Schema.Schema.Type<typeof AutomationCurve>;

export const AutomationPoint = Schema.Struct({
  id: AutomationPointId,
  timeQN: QN.Schema,
  value: Schema.Number,
  curve: AutomationCurve,
});
export type AutomationPoint = Schema.Schema.Type<typeof AutomationPoint>;

export const AutomationLane = Schema.Struct({
  id: AutomationLaneId,
  projectId: ProjectId,
  trackId: TrackId,
  paramPath: Schema.String,
  points: Schema.Array(AutomationPoint),
});
export type AutomationLane = Schema.Schema.Type<typeof AutomationLane>;
