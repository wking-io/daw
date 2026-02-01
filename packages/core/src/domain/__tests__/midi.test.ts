import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import type { NoteId, PatternId, ProjectId } from "../../ids";
import { MidiNote, MidiPattern } from "../midi";
import type { QN } from "../qn";

describe("MidiNote schema", () => {
  const validNote = {
    id: "note-1" as NoteId,
    pitch: 60,
    velocity: 100,
    span: { start: 0 as QN, size: 1 as QN },
  };

  it("decodes valid midi note", () => {
    const decoded = Schema.decodeUnknownSync(MidiNote)(validNote);
    expect(decoded.pitch).toBe(60);
    expect(decoded.velocity).toBe(100);
  });

  it("rejects pitch below 0", () => {
    expect(() => Schema.decodeUnknownSync(MidiNote)({ ...validNote, pitch: -1 })).toThrow();
  });

  it("rejects pitch above 127", () => {
    expect(() => Schema.decodeUnknownSync(MidiNote)({ ...validNote, pitch: 128 })).toThrow();
  });

  it("rejects non-integer pitch", () => {
    expect(() =>
      Schema.decodeUnknownSync(MidiNote)({
        ...validNote,
        pitch: 60.5,
      }),
    ).toThrow();
  });

  it("rejects velocity below 0", () => {
    expect(() =>
      Schema.decodeUnknownSync(MidiNote)({
        ...validNote,
        velocity: -1,
      }),
    ).toThrow();
  });

  it("rejects velocity above 127", () => {
    expect(() =>
      Schema.decodeUnknownSync(MidiNote)({
        ...validNote,
        velocity: 128,
      }),
    ).toThrow();
  });
});

describe("MidiPattern schema", () => {
  const validPattern = {
    id: "pattern-1" as PatternId,
    projectId: "proj-123" as ProjectId,
    name: "Bassline",
    notes: [
      {
        id: "note-1" as NoteId,
        pitch: 36,
        velocity: 100,
        span: { start: 0 as QN, size: 1 as QN },
      },
    ],
  };

  it("decodes valid midi pattern", () => {
    const decoded = Schema.decodeUnknownSync(MidiPattern)(validPattern);
    expect(decoded.id).toBe("pattern-1" as PatternId);
    expect(decoded.name).toBe("Bassline");
    expect(decoded.notes).toHaveLength(1);
  });

  it("accepts empty notes array", () => {
    const decoded = Schema.decodeUnknownSync(MidiPattern)({
      ...validPattern,
      notes: [],
    });
    expect(decoded.notes).toHaveLength(0);
  });
});
