import { describe, expect, it } from "bun:test";
import { visibleTrackSlice } from "./visible-track-slice";

describe("visibleTrackSlice", () => {
  const tracks = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"];

  it("returns all tracks when viewport fits them all", () => {
    const result = visibleTrackSlice(tracks, 0, 800, 100);
    expect(result).toEqual(tracks);
  });

  it("returns visible subset when scrolled", () => {
    // scrollTop=200, viewport=300, rowHeight=100 → rows 2..4
    const result = visibleTrackSlice(tracks, 200, 300, 100);
    expect(result).toEqual(["t2", "t3", "t4"]);
  });

  it("handles partial rows", () => {
    // scrollTop=150, viewport=200, rowHeight=100 → row0=1, row1=ceil(350/100)=4
    const result = visibleTrackSlice(tracks, 150, 200, 100);
    expect(result).toEqual(["t1", "t2", "t3"]);
  });

  it("clamps to array bounds", () => {
    const result = visibleTrackSlice(tracks, 600, 500, 100);
    expect(result).toEqual(["t6", "t7"]);
  });

  it("returns empty for zero row height", () => {
    const result = visibleTrackSlice(tracks, 0, 300, 0);
    expect(result).toEqual([]);
  });
});
