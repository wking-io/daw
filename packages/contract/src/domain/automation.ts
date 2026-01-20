import { Schema } from "effect";
import {
	AutomationLaneId,
	AutomationPointId,
	ProjectId,
	QN,
	TrackId,
} from "../ids";

export const AutomationCurve = Schema.Literal("linear", "expo", "log", "hold");
export type AutomationCurve = typeof AutomationCurve.Type;

export const AutomationPoint = Schema.Struct({
	id: AutomationPointId,
	timeQN: QN,
	value: Schema.Number,
	curve: AutomationCurve,
});
export type AutomationPoint = typeof AutomationPoint.Type;

export const AutomationLane = Schema.Struct({
	id: AutomationLaneId,
	projectId: ProjectId,
	trackId: TrackId,
	paramPath: Schema.String,
	points: Schema.Array(AutomationPoint),
});
export type AutomationLane = typeof AutomationLane.Type;
