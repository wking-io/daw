import { Schema } from "effect";
import { QNSpan } from "../domain";
import { NoteId, PatternId } from "../ids";

export const MidiPatternRename = Schema.Struct({
	t: Schema.Literal("midi.renamePattern"),
	patternId: PatternId,
	name: Schema.String,
});
export type MidiPatternRename = Schema.Schema.Type<typeof MidiPatternRename>;

export const MidiAddNote = Schema.Struct({
	t: Schema.Literal("midi.addNote"),
	noteId: NoteId,
	patternId: PatternId,
	pitch: Schema.Number,
	velocity: Schema.Number,
	span: QNSpan,
});
export type MidiAddNote = Schema.Schema.Type<typeof MidiAddNote>;

export const MidiDeleteNote = Schema.Struct({
	t: Schema.Literal("midi.deleteNote"),
	patternId: PatternId,
	noteId: NoteId,
});
export type MidiDeleteNote = Schema.Schema.Type<typeof MidiDeleteNote>;

export const MidiMoveNote = Schema.Struct({
	t: Schema.Literal("midi.moveNote"),
	patternId: PatternId,
	noteId: NoteId,
	span: QNSpan,
});
export type MidiMoveNote = Schema.Schema.Type<typeof MidiMoveNote>;

export const MidiSetNoteVelocity = Schema.Struct({
	t: Schema.Literal("midi.setNoteVelocity"),
	patternId: PatternId,
	noteId: NoteId,
	velocity: Schema.Number,
});
export type MidiSetNoteVelocity = Schema.Schema.Type<
	typeof MidiSetNoteVelocity
>;

export const MidiSetNotePitch = Schema.Struct({
	t: Schema.Literal("midi.setNotePitch"),
	patternId: PatternId,
	noteId: NoteId,
	pitch: Schema.Number,
});
export type MidiSetNotePitch = Schema.Schema.Type<typeof MidiSetNotePitch>;

export const MidiOperation = Schema.Union(
	MidiPatternRename,
	MidiAddNote,
	MidiDeleteNote,
	MidiMoveNote,
	MidiSetNoteVelocity,
	MidiSetNotePitch,
);
export type MidiOperation = Schema.Schema.Type<typeof MidiOperation>;
