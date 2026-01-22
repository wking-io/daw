import { Schema } from "effect";
import { AutomationCurve } from "../domain";
import { AutomationLaneId, AutomationPointId, QN, TrackId } from "../ids";

export const AutomationCreateLane = Schema.Struct({
	t: Schema.Literal("automation.createLane"),
	trackId: TrackId,
	paramPath: Schema.String,
});
export type AutomationCreateLane = typeof AutomationCreateLane.Type;

export const AutomationDeleteLane = Schema.Struct({
	t: Schema.Literal("automation.deleteLane"),
	laneId: AutomationLaneId,
});
export type AutomationDeleteLane = typeof AutomationDeleteLane.Type;

export const AutomationAddPoint = Schema.Struct({
	t: Schema.Literal("automation.addPoint"),
	laneId: AutomationLaneId,
	timeQN: QN,
	value: Schema.Number,
	curve: Schema.optional(AutomationCurve),
});
export type AutomationAddPoint = typeof AutomationAddPoint.Type;

export const AutomationDeletePoint = Schema.Struct({
	t: Schema.Literal("automation.deletePoint"),
	laneId: AutomationLaneId,
	pointId: AutomationPointId,
});
export type AutomationDeletePoint = typeof AutomationDeletePoint.Type;

export const AutomationMovePoint = Schema.Struct({
	t: Schema.Literal("automation.movePoint"),
	laneId: AutomationLaneId,
	pointId: AutomationPointId,
	timeQN: Schema.optional(QN),
	value: Schema.optional(Schema.Number),
});
export type AutomationMovePoint = typeof AutomationMovePoint.Type;

export const AutomationSetPointCurve = Schema.Struct({
	t: Schema.Literal("automation.setPointCurve"),
	laneId: AutomationLaneId,
	pointId: AutomationPointId,
	curve: AutomationCurve,
});
export type AutomationSetPointCurve = typeof AutomationSetPointCurve.Type;

export const AutomationOperation = Schema.Union(
	AutomationCreateLane,
	AutomationDeleteLane,
	AutomationAddPoint,
	AutomationDeletePoint,
	AutomationMovePoint,
	AutomationSetPointCurve,
);
export type AutomationOperation = typeof AutomationOperation.Type;
