import { Schema } from "effect";
import { NoteId, PatternId, ProjectId } from "../ids";
import { QNSpan } from "./clip";

export const MidiNote = Schema.Struct({
	id: NoteId,
	pitch: Schema.Number.pipe(Schema.int(), Schema.between(0, 127)),
	velocity: Schema.Number.pipe(Schema.int(), Schema.between(0, 127)),
	span: QNSpan,
});
export type MidiNote = Schema.Schema.Type<typeof MidiNote>;

export const MidiPattern = Schema.Struct({
	id: PatternId,
	projectId: ProjectId,
	name: Schema.String,
	notes: Schema.Array(MidiNote),
});
export type MidiPattern = Schema.Schema.Type<typeof MidiPattern>;
