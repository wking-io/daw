import { Schema } from "effect";
import { QNSpan } from "../domain/clip";
import { MidiNote } from "../domain/midi";
import * as Ids from "../ids";

export const MidiPatternRenamed = Schema.Struct({
  t: Schema.Literal("midi.patternRenamed"),
  patternId: Ids.PatternId,
  name: Schema.String,
});
export type MidiPatternRenamed = Schema.Schema.Type<typeof MidiPatternRenamed>;

export const MidiNoteAdded = Schema.Struct({
  t: Schema.Literal("midi.noteAdded"),
  patternId: Ids.PatternId,
  note: MidiNote,
});
export type MidiNoteAdded = Schema.Schema.Type<typeof MidiNoteAdded>;

export const MidiNoteDeleted = Schema.Struct({
  t: Schema.Literal("midi.noteDeleted"),
  patternId: Ids.PatternId,
  noteId: Ids.NoteId,
});
export type MidiNoteDeleted = Schema.Schema.Type<typeof MidiNoteDeleted>;

export const MidiNoteMoved = Schema.Struct({
  t: Schema.Literal("midi.noteMoved"),
  patternId: Ids.PatternId,
  noteId: Ids.NoteId,
  span: QNSpan,
});
export type MidiNoteMoved = Schema.Schema.Type<typeof MidiNoteMoved>;

export const MidiNoteVelocityChanged = Schema.Struct({
  t: Schema.Literal("midi.noteVelocityChanged"),
  patternId: Ids.PatternId,
  noteId: Ids.NoteId,
  velocity: Schema.Number,
});
export type MidiNoteVelocityChanged = Schema.Schema.Type<typeof MidiNoteVelocityChanged>;

export const MidiNotePitchChanged = Schema.Struct({
  t: Schema.Literal("midi.notePitchChanged"),
  patternId: Ids.PatternId,
  noteId: Ids.NoteId,
  pitch: Schema.Number,
});
export type MidiNotePitchChanged = Schema.Schema.Type<typeof MidiNotePitchChanged>;

export const MidiEvent = Schema.Union(
  MidiPatternRenamed,
  MidiNoteAdded,
  MidiNoteDeleted,
  MidiNoteMoved,
  MidiNoteVelocityChanged,
  MidiNotePitchChanged,
);
export type MidiEvent = Schema.Schema.Type<typeof MidiEvent>;
