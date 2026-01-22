import { Schema } from "effect";
import { QNSpan } from "../domain";
import { NoteId, PatternId } from "../ids";

export const MidiPatternRename = Schema.Struct({
	t: Schema.Literal("midi.renamePattern"),
	patternId: PatternId,
	name: Schema.String,
});
export type MidiPatternRename = typeof MidiPatternRename.Type;

export const MidiAddNote = Schema.Struct({
	t: Schema.Literal("midi.addNote"),
	patternId: PatternId,
	pitch: Schema.Number,
	velocity: Schema.Number,
	span: QNSpan,
});
export type MidiAddNote = typeof MidiAddNote.Type;

export const MidiDeleteNote = Schema.Struct({
	t: Schema.Literal("midi.deleteNote"),
	patternId: PatternId,
	noteId: NoteId,
});
export type MidiDeleteNote = typeof MidiDeleteNote.Type;

export const MidiMoveNote = Schema.Struct({
	t: Schema.Literal("midi.moveNote"),
	patternId: PatternId,
	noteId: NoteId,
	span: QNSpan,
});
export type MidiMoveNote = typeof MidiMoveNote.Type;

export const MidiSetNoteVelocity = Schema.Struct({
	t: Schema.Literal("midi.setNoteVelocity"),
	patternId: PatternId,
	noteId: NoteId,
	velocity: Schema.Number,
});
export type MidiSetNoteVelocity = typeof MidiSetNoteVelocity.Type;

export const MidiSetNotePitch = Schema.Struct({
	t: Schema.Literal("midi.setNotePitch"),
	patternId: PatternId,
	noteId: NoteId,
	pitch: Schema.Number,
});
export type MidiSetNotePitch = typeof MidiSetNotePitch.Type;

export const MidiOperation = Schema.Union(
	MidiPatternRename,
	MidiAddNote,
	MidiDeleteNote,
	MidiMoveNote,
	MidiSetNoteVelocity,
	MidiSetNotePitch,
);
export type MidiOperation = typeof MidiOperation.Type;
