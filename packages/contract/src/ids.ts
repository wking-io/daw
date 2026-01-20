import { Schema } from "effect";
import type { Numeric } from "./lib/numeric";

// Entity IDs (ULIDs)
export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"));
export type ProjectId = typeof ProjectId.Type;

export const TrackId = Schema.String.pipe(Schema.brand("TrackId"));
export type TrackId = typeof TrackId.Type;

export const ClipId = Schema.String.pipe(Schema.brand("ClipId"));
export type ClipId = typeof ClipId.Type;

export const PatternId = Schema.String.pipe(Schema.brand("PatternId"));
export type PatternId = typeof PatternId.Type;

export const NoteId = Schema.String.pipe(Schema.brand("NoteId"));
export type NoteId = typeof NoteId.Type;

export const AutomationLaneId = Schema.String.pipe(
	Schema.brand("AutomationLaneId"),
);
export type AutomationLaneId = typeof AutomationLaneId.Type;

export const AutomationPointId = Schema.String.pipe(
	Schema.brand("AutomationPointId"),
);
export type AutomationPointId = typeof AutomationPointId.Type;

export const AudioFileId = Schema.String.pipe(Schema.brand("AudioFileId"));
export type AudioFileId = typeof AudioFileId.Type;

export const DeviceId = Schema.String.pipe(Schema.brand("DeviceId"));
export type DeviceId = typeof DeviceId.Type;

// Quarter-note position (branded for type safety)
export const QN = Schema.Number.pipe(Schema.brand("QN"));
export type QN = typeof QN.Type;

// QN-specific Numeric instance for use with Span/Range
export const QNNumeric: Numeric<QN> = {
	make: (n) => n as QN,
	zero: 0 as QN,
	add: (a, b) => (a + b) as QN,
	subtract: (a, b) => (a - b) as QN,
	multiply: (a, b) => (a * b) as QN,
	divide: (a, b) => (a / b) as QN,
	min: (a, b) => Math.min(a, b) as QN,
	max: (a, b) => Math.max(a, b) as QN,
	clamp: (x, low, high) => Math.min(Math.max(x, low), high) as QN,
	eq: (a, b) => a === b,
	lte: (a, b) => a <= b,
	lt: (a, b) => a < b,
	gt: (a, b) => a > b,
	gte: (a, b) => a >= b,
};
