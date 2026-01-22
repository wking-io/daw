import { Schema } from "effect";
import * as Domain from "../domain";
import * as Ids from "../ids";

export const AutomationLaneCreated = Schema.Struct({
	t: Schema.Literal("automation.laneCreated"),
	lane: Domain.AutomationLane,
});
export type AutomationLaneCreated = typeof AutomationLaneCreated.Type;

export const AutomationLaneDeleted = Schema.Struct({
	t: Schema.Literal("automation.laneDeleted"),
	laneId: Ids.AutomationLaneId,
});
export type AutomationLaneDeleted = typeof AutomationLaneDeleted.Type;

export const AutomationPointAdded = Schema.Struct({
	t: Schema.Literal("automation.pointAdded"),
	laneId: Ids.AutomationLaneId,
	point: Domain.AutomationPoint,
});
export type AutomationPointAdded = typeof AutomationPointAdded.Type;

export const AutomationPointDeleted = Schema.Struct({
	t: Schema.Literal("automation.pointDeleted"),
	laneId: Ids.AutomationLaneId,
	pointId: Ids.AutomationPointId,
});
export type AutomationPointDeleted = typeof AutomationPointDeleted.Type;

export const AutomationPointMoved = Schema.Struct({
	t: Schema.Literal("automation.pointMoved"),
	laneId: Ids.AutomationLaneId,
	pointId: Ids.AutomationPointId,
	time: Schema.optional(Domain.QN),
	value: Schema.optional(Schema.Number),
});
export type AutomationPointMoved = typeof AutomationPointMoved.Type;

export const AutomationPointCurveChanged = Schema.Struct({
	t: Schema.Literal("automation.pointCurveChanged"),
	laneId: Ids.AutomationLaneId,
	pointId: Ids.AutomationPointId,
	curve: Domain.AutomationCurve,
});
export type AutomationPointCurveChanged =
	typeof AutomationPointCurveChanged.Type;

export const AutomationEvent = Schema.Union(
	AutomationLaneCreated,
	AutomationLaneDeleted,
	AutomationPointAdded,
	AutomationPointDeleted,
	AutomationPointMoved,
	AutomationPointCurveChanged,
);
export type AutomationEvent = typeof AutomationEvent.Type;
