import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import type { ProjectId, TrackId } from "../../ids";
import { Track } from "../track";

describe("Track schema", () => {
  const validTrack = {
    id: "track-1" as TrackId,
    projectId: "proj-123" as ProjectId,
    type: "midi" as const,
    name: "Bass",
    color: "ruby",
    volumeDb: -6,
    pan: 0,
    mute: false,
    solo: false,
    compact: false,
    heightMultiplier: 4,
    sortOrder: 0,
    deviceIds: [],
  };

  it("decodes valid track", () => {
    const decoded = Schema.decodeUnknownSync(Track)(validTrack);
    expect(decoded.id).toBe("track-1" as TrackId);
    expect(decoded.type).toBe("midi");
    expect(decoded.name).toBe("Bass");
  });

  it("accepts audio track type", () => {
    const decoded = Schema.decodeUnknownSync(Track)({
      ...validTrack,
      type: "audio",
    });
    expect(decoded.type).toBe("audio");
  });

  it("accepts bus track type", () => {
    const decoded = Schema.decodeUnknownSync(Track)({
      ...validTrack,
      type: "bus",
    });
    expect(decoded.type).toBe("bus");
  });

  it("rejects invalid track type", () => {
    expect(() =>
      Schema.decodeUnknownSync(Track)({
        ...validTrack,
        type: "invalid",
      }),
    ).toThrow();
  });

  it("rejects pan below -1", () => {
    expect(() => Schema.decodeUnknownSync(Track)({ ...validTrack, pan: -1.5 })).toThrow();
  });

  it("rejects pan above 1", () => {
    expect(() => Schema.decodeUnknownSync(Track)({ ...validTrack, pan: 1.5 })).toThrow();
  });
});
