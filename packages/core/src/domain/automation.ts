import { Schema } from "effect";
import { AutomationLaneId, AutomationPointId, ProjectId, QN, TrackId } from "../ids";

export const AutomationCurve = Schema.Literal("linear", "expo", "log", "hold");
export type AutomationCurve = Schema.Schema.Type<typeof AutomationCurve>;

export const AutomationPoint = Schema.Struct({
  id: AutomationPointId,
  timeQN: QN,
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
