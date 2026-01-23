import { Schema } from "effect";
import { AutomationCurve } from "../domain";
import { AutomationLaneId, AutomationPointId, QN, TrackId } from "../ids";

export const AutomationCreateLane = Schema.Struct({
	t: Schema.Literal("automation.createLane"),
	laneId: AutomationLaneId,
	trackId: TrackId,
	paramPath: Schema.String,
});
export type AutomationCreateLane = Schema.Schema.Type<
	typeof AutomationCreateLane
>;

export const AutomationDeleteLane = Schema.Struct({
	t: Schema.Literal("automation.deleteLane"),
	laneId: AutomationLaneId,
});
export type AutomationDeleteLane = Schema.Schema.Type<
	typeof AutomationDeleteLane
>;

export const AutomationAddPoint = Schema.Struct({
	t: Schema.Literal("automation.addPoint"),
	pointId: AutomationPointId,
	laneId: AutomationLaneId,
	timeQN: QN,
	value: Schema.Number,
	curve: Schema.optional(AutomationCurve),
});
export type AutomationAddPoint = Schema.Schema.Type<typeof AutomationAddPoint>;

export const AutomationDeletePoint = Schema.Struct({
	t: Schema.Literal("automation.deletePoint"),
	laneId: AutomationLaneId,
	pointId: AutomationPointId,
});
export type AutomationDeletePoint = Schema.Schema.Type<
	typeof AutomationDeletePoint
>;

export const AutomationMovePoint = Schema.Struct({
	t: Schema.Literal("automation.movePoint"),
	laneId: AutomationLaneId,
	pointId: AutomationPointId,
	timeQN: Schema.optional(QN),
	value: Schema.optional(Schema.Number),
});
export type AutomationMovePoint = Schema.Schema.Type<
	typeof AutomationMovePoint
>;

export const AutomationSetPointCurve = Schema.Struct({
	t: Schema.Literal("automation.setPointCurve"),
	laneId: AutomationLaneId,
	pointId: AutomationPointId,
	curve: AutomationCurve,
});
export type AutomationSetPointCurve = Schema.Schema.Type<
	typeof AutomationSetPointCurve
>;

export const AutomationOperation = Schema.Union(
	AutomationCreateLane,
	AutomationDeleteLane,
	AutomationAddPoint,
	AutomationDeletePoint,
	AutomationMovePoint,
	AutomationSetPointCurve,
);
export type AutomationOperation = Schema.Schema.Type<
	typeof AutomationOperation
>;
