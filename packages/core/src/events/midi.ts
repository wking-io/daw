import { Schema } from "effect";
import * as Domain from "../domain";
import * as Ids from "../ids";

export const MidiPatternRenamed = Schema.Struct({
	t: Schema.Literal("midi.patternRenamed"),
	patternId: Ids.PatternId,
	name: Schema.String,
});
export type MidiPatternRenamed = typeof MidiPatternRenamed.Type;

export const MidiNoteAdded = Schema.Struct({
	t: Schema.Literal("midi.noteAdded"),
	patternId: Ids.PatternId,
	note: Domain.MidiNote,
});
export type MidiNoteAdded = typeof MidiNoteAdded.Type;

export const MidiNoteDeleted = Schema.Struct({
	t: Schema.Literal("midi.noteDeleted"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
});
export type MidiNoteDeleted = typeof MidiNoteDeleted.Type;

export const MidiNoteMoved = Schema.Struct({
	t: Schema.Literal("midi.noteMoved"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
	span: Domain.QNSpan,
});
export type MidiNoteMoved = typeof MidiNoteMoved.Type;

export const MidiNoteVelocityChanged = Schema.Struct({
	t: Schema.Literal("midi.noteVelocityChanged"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
	velocity: Schema.Number,
});
export type MidiNoteVelocityChanged = typeof MidiNoteVelocityChanged.Type;

export const MidiNotePitchChanged = Schema.Struct({
	t: Schema.Literal("midi.notePitchChanged"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
	pitch: Schema.Number,
});
export type MidiNotePitchChanged = typeof MidiNotePitchChanged.Type;

export const MidiEvent = Schema.Union(
	MidiPatternRenamed,
	MidiNoteAdded,
	MidiNoteDeleted,
	MidiNoteMoved,
	MidiNoteVelocityChanged,
	MidiNotePitchChanged,
);
export type MidiEvent = typeof MidiEvent.Type;
