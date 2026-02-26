import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import type { AutomationLaneId, AutomationPointId, ProjectId, TrackId } from "../../ids";
import { AutomationLane, AutomationPoint } from "../automation";
import * as QN from "../../lib/qn";

describe("AutomationLane schema", () => {
  const validLane = {
    id: "lane-1" as AutomationLaneId,
    projectId: "proj-123" as ProjectId,
    trackId: "track-1" as TrackId,
    paramPath: "volume",
    points: [],
  };

  it("decodes valid automation lane", () => {
    const decoded = Schema.decodeUnknownSync(AutomationLane)(validLane);
    expect(decoded.id).toBe("lane-1" as AutomationLaneId);
    expect(decoded.paramPath).toBe("volume");
  });
});

describe("AutomationPoint schema", () => {
  const validPoint = {
    id: "point-1" as AutomationPointId,
    time: QN.QN(0),
    value: 0.5,
    curve: "linear" as const,
  };

  it("decodes valid automation point", () => {
    const decoded = Schema.decodeUnknownSync(AutomationPoint)(validPoint);
    expect(decoded.id).toBe("point-1" as AutomationPointId);
    expect(decoded.value).toBe(0.5);
    expect(decoded.curve).toBe("linear");
  });

  it("accepts different curve types", () => {
    for (const curve of ["linear", "expo", "log", "hold"] as const) {
      const decoded = Schema.decodeUnknownSync(AutomationPoint)({
        ...validPoint,
        curve,
      });
      expect(decoded.curve).toBe(curve);
    }
  });

  it("rejects invalid curve type", () => {
    expect(() =>
      Schema.decodeUnknownSync(AutomationPoint)({
        ...validPoint,
        curve: "invalid",
      }),
    ).toThrow();
  });
});
