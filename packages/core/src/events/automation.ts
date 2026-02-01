import { Schema } from "effect";
import { AutomationCurve, AutomationLane, AutomationPoint } from "../domain/automation";
import * as Ids from "../ids";
import { QN } from "../ids";

export const AutomationLaneCreated = Schema.Struct({
  t: Schema.Literal("automation.laneCreated"),
  lane: AutomationLane,
});
export type AutomationLaneCreated = Schema.Schema.Type<typeof AutomationLaneCreated>;

export const AutomationLaneDeleted = Schema.Struct({
  t: Schema.Literal("automation.laneDeleted"),
  laneId: Ids.AutomationLaneId,
});
export type AutomationLaneDeleted = Schema.Schema.Type<typeof AutomationLaneDeleted>;

export const AutomationPointAdded = Schema.Struct({
  t: Schema.Literal("automation.pointAdded"),
  laneId: Ids.AutomationLaneId,
  point: AutomationPoint,
});
export type AutomationPointAdded = Schema.Schema.Type<typeof AutomationPointAdded>;

export const AutomationPointDeleted = Schema.Struct({
  t: Schema.Literal("automation.pointDeleted"),
  laneId: Ids.AutomationLaneId,
  pointId: Ids.AutomationPointId,
});
export type AutomationPointDeleted = Schema.Schema.Type<typeof AutomationPointDeleted>;

export const AutomationPointMoved = Schema.Struct({
  t: Schema.Literal("automation.pointMoved"),
  laneId: Ids.AutomationLaneId,
  pointId: Ids.AutomationPointId,
  time: Schema.optional(QN),
  value: Schema.optional(Schema.Number),
});
export type AutomationPointMoved = Schema.Schema.Type<typeof AutomationPointMoved>;

export const AutomationPointCurveChanged = Schema.Struct({
  t: Schema.Literal("automation.pointCurveChanged"),
  laneId: Ids.AutomationLaneId,
  pointId: Ids.AutomationPointId,
  curve: AutomationCurve,
});
export type AutomationPointCurveChanged = Schema.Schema.Type<typeof AutomationPointCurveChanged>;

export const AutomationEvent = Schema.Union(
  AutomationLaneCreated,
  AutomationLaneDeleted,
  AutomationPointAdded,
  AutomationPointDeleted,
  AutomationPointMoved,
  AutomationPointCurveChanged,
);
export type AutomationEvent = Schema.Schema.Type<typeof AutomationEvent>;
