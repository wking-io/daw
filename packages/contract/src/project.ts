import { Schema } from "effect";
import { Instrument, InstrumentId, InstrumentType } from "./instrument/domain";

export const ProjectVersion = Schema.Number;
export type ProjectVersion = typeof ProjectVersion.Type;

export const ProjectDoc = Schema.Struct({
	instruments: Schema.Array(Instrument),
});
export type ProjectDoc = typeof ProjectDoc.Type;

export const OpInstrumentCreate = Schema.Struct({
	t: Schema.Literal("instrument.create"),
	type: InstrumentType,
	name: Schema.String,
	preset: Schema.optional(Schema.String),
	instrumentId: Schema.optional(InstrumentId),
	createdAt: Schema.optional(Schema.Number),
});
export type OpInstrumentCreate = typeof OpInstrumentCreate.Type;

export const Op = Schema.Union(OpInstrumentCreate);
export type Op = typeof Op.Type;

export const Submit = Schema.Struct({
	opId: Schema.String,
	baseVersion: ProjectVersion,
	actor: Schema.Literal("ui", "agent"),
	op: Op,
});
export type Submit = typeof Submit.Type;

export const PatchInstrumentAdd = Schema.Struct({
	t: Schema.Literal("instrument.add"),
	instrument: Instrument,
});
export type PatchInstrumentAdd = typeof PatchInstrumentAdd.Type;

export const Patch = Schema.Union(PatchInstrumentAdd);
export type Patch = typeof Patch.Type;

export const PatchBatch = Schema.Struct({
	version: ProjectVersion,
	patches: Schema.Array(Patch),
});
export type PatchBatch = typeof PatchBatch.Type;

export const AudioDelta = Schema.Union(
	Schema.Struct({
		t: Schema.Literal("noop"),
	}),
);
export type AudioDelta = typeof AudioDelta.Type;

export const AudioDeltaBatch = Schema.Struct({
	version: ProjectVersion,
	deltas: Schema.Array(AudioDelta),
});
export type AudioDeltaBatch = typeof AudioDeltaBatch.Type;

export const SubmitResult = Schema.Struct({
	version: ProjectVersion,
	patches: PatchBatch,
	audioDeltas: AudioDeltaBatch,
});
export type SubmitResult = typeof SubmitResult.Type;

export const Snapshot = Schema.Struct({
	version: ProjectVersion,
	doc: ProjectDoc,
});
export type Snapshot = typeof Snapshot.Type;

export const OpEntry = Schema.Struct({
	version: ProjectVersion,
	submit: Submit,
});
export type OpEntry = typeof OpEntry.Type;

export const OpsResponse = Schema.Struct({
	fromVersion: ProjectVersion,
	ops: Schema.Array(OpEntry),
});
export type OpsResponse = typeof OpsResponse.Type;
