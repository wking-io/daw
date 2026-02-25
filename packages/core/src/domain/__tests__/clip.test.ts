import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import type { AudioFileId, ClipId, PatternId, ProjectId, TrackId } from "../../ids";
import { Clip } from "../clip";
import type { QN } from "../../lib/qn";

describe("Clip schema", () => {
  const validMidiClip = {
    id: "clip-1" as ClipId,
    projectId: "proj-123" as ProjectId,
    trackId: "track-1" as TrackId,
    span: { start: 0 as QN, size: 4 as QN },
    sortOrder: 0,
    payload: { kind: "midi" as const, patternId: "pattern-1" as PatternId, length: 4 as QN },
    offset: 0 as QN,
  };

  it("decodes valid midi clip", () => {
    const decoded = Schema.decodeUnknownSync(Clip)(validMidiClip);
    expect(decoded.id).toBe("clip-1" as ClipId);
    expect(decoded.payload.kind).toBe("midi");
    if (decoded.payload.kind === "midi") {
      expect(decoded.payload.patternId).toBe("pattern-1" as PatternId);
    }
  });

  it("decodes valid audio clip", () => {
    const audioClip = {
      ...validMidiClip,
      payload: {
        kind: "audio" as const,
        audioFileId: "audio-1" as AudioFileId,
        offset: 0,
        length: 4 as QN,
      },
    };
    const decoded = Schema.decodeUnknownSync(Clip)(audioClip);
    expect(decoded.payload.kind).toBe("audio");
    if (decoded.payload.kind === "audio") {
      expect(decoded.payload.audioFileId).toBe("audio-1" as AudioFileId);
    }
  });

  it("decodes valid midi-loop clip", () => {
    const loopClip = {
      ...validMidiClip,
      payload: {
        kind: "midi-loop" as const,
        patternId: "pattern-1" as PatternId,
        length: 4 as QN,
        loop: { start: 0 as QN, size: 4 as QN },
      },
    };
    const decoded = Schema.decodeUnknownSync(Clip)(loopClip);
    expect(decoded.payload.kind).toBe("midi-loop");
    if (decoded.payload.kind === "midi-loop") {
      expect(decoded.payload.patternId).toBe("pattern-1" as PatternId);
      expect(decoded.payload.loop.size).toBe(4 as QN);
    }
  });

  it("decodes valid audio-loop clip", () => {
    const loopClip = {
      ...validMidiClip,
      payload: {
        kind: "audio-loop" as const,
        audioFileId: "audio-1" as AudioFileId,
        offset: 0,
        length: 4 as QN,
        loop: { start: 0 as QN, size: 2 as QN },
      },
    };
    const decoded = Schema.decodeUnknownSync(Clip)(loopClip);
    expect(decoded.payload.kind).toBe("audio-loop");
    if (decoded.payload.kind === "audio-loop") {
      expect(decoded.payload.audioFileId).toBe("audio-1" as AudioFileId);
      expect(decoded.payload.loop.size).toBe(2 as QN);
    }
  });
});
