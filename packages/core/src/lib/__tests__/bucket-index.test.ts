import { describe, expect, it } from "bun:test";
import { QN } from "../qn";
import * as BucketIndex from "../bucket-index";

// Default bucket size: 4 QN (one bar of 4/4)
const BAR = 4;

function makeClip(id: string, trackId: string, start: number, size: number): any {
  return { id, trackId, span: { start: QN(start), size: QN(size) } };
}

/** Create a Span<QN> from a half-open [start, end) interval. */
function span(start: number, end: number) {
  return { start: QN(start), size: QN(end - start) };
}

describe("lib/bucket-index", () => {
  describe("make", () => {
    it("creates an empty index", () => {
      const index = BucketIndex.make(BAR);
      expect(index.bucketSize).toBe(BAR);
      expect(index.byTrack.size).toBe(0);
      expect(index.spanByClip.size).toBe(0);
      expect(index.version).toBe(0);
    });
  });

  describe("addClip", () => {
    it("adds a clip spanning one bucket", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));

      expect(index.spanByClip.size).toBe(1);
      expect(index.version).toBe(1);
      expect(index.byTrack.get("t1")?.get(0)?.has("c1")).toBe(true);
    });

    it("adds a clip spanning multiple buckets", () => {
      const index = BucketIndex.make(BAR);
      // [2, 10) spans buckets 0, 1, 2
      BucketIndex.addClip(index, makeClip("c1", "t1", 2, 8));

      const trackMap = index.byTrack.get("t1")!;
      expect(trackMap.get(0)?.has("c1")).toBe(true);
      expect(trackMap.get(1)?.has("c1")).toBe(true);
      expect(trackMap.get(2)?.has("c1")).toBe(true);
      // Not in bucket 3
      expect(trackMap.get(3)).toBeUndefined();
    });

    it("handles clip ending exactly on bucket boundary", () => {
      const index = BucketIndex.make(BAR);
      // [0, 4) should only be in bucket 0
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));

      const trackMap = index.byTrack.get("t1")!;
      expect(trackMap.get(0)?.has("c1")).toBe(true);
      expect(trackMap.get(1)).toBeUndefined();
    });

    it("handles clip starting at bucket boundary", () => {
      const index = BucketIndex.make(BAR);
      // [4, 6) should only be in bucket 1
      BucketIndex.addClip(index, makeClip("c1", "t1", 4, 2));

      const trackMap = index.byTrack.get("t1")!;
      expect(trackMap.get(0)).toBeUndefined();
      expect(trackMap.get(1)?.has("c1")).toBe(true);
    });

    it("handles zero-size clip", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 4, 0));
      // Zero-size clip is stored but spans no buckets
      expect(index.spanByClip.size).toBe(1);
      expect(index.version).toBe(1);
    });

    it("tracks multiple clips on same track", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));
      BucketIndex.addClip(index, makeClip("c2", "t1", 1, 2.5));

      const bucket = index.byTrack.get("t1")!.get(0)!;
      expect(bucket.has("c1")).toBe(true);
      expect(bucket.has("c2")).toBe(true);
    });

    it("tracks clips on different tracks independently", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));
      BucketIndex.addClip(index, makeClip("c2", "t2", 0, 3));

      expect(index.byTrack.get("t1")?.get(0)?.has("c1")).toBe(true);
      expect(index.byTrack.get("t2")?.get(0)?.has("c2")).toBe(true);
      expect(index.byTrack.get("t1")?.get(0)?.has("c2")).toBeFalsy();
    });
  });

  describe("removeClip", () => {
    it("removes a clip from the index", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 6));
      const v = index.version;
      BucketIndex.removeClip(index, "c1");

      expect(index.spanByClip.size).toBe(0);
      expect(index.version).toBe(v + 1);
      // Track map cleaned up
      expect(index.byTrack.has("t1")).toBe(false);
    });

    it("cleans up empty buckets", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));
      BucketIndex.addClip(index, makeClip("c2", "t1", 0, 3));
      BucketIndex.removeClip(index, "c1");

      // Bucket 0 still has c2
      expect(index.byTrack.get("t1")?.get(0)?.has("c2")).toBe(true);
      expect(index.byTrack.get("t1")?.get(0)?.has("c1")).toBeFalsy();
    });

    it("no-op for unknown clip", () => {
      const index = BucketIndex.make(BAR);
      const v = index.version;
      BucketIndex.removeClip(index, "unknown");
      expect(index.version).toBe(v);
    });
  });

  describe("moveClip", () => {
    it("moves a clip within the same track", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));

      // Move from [0,3) to [5,8)
      BucketIndex.moveClip(index, "c1", QN(5));

      const trackMap = index.byTrack.get("t1")!;
      expect(trackMap.get(0)).toBeUndefined();
      expect(trackMap.get(1)?.has("c1")).toBe(true);
      expect(trackMap.get(2)).toBeUndefined();

      const entry = index.spanByClip.get("c1")!;
      expect(Number(entry.span.start)).toBe(5);
      expect(Number(entry.span.start) + Number(entry.span.size)).toBe(8);
    });

    it("moves a clip to a different track", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));

      BucketIndex.moveClip(index, "c1", QN(0), "t2");

      expect(index.byTrack.get("t1")).toBeUndefined();
      expect(index.byTrack.get("t2")?.get(0)?.has("c1")).toBe(true);
      expect(index.spanByClip.get("c1")?.trackId).toBe("t2");
    });

    it("preserves clip size when moving", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 2, 8)); // size = 8

      BucketIndex.moveClip(index, "c1", QN(12));

      const entry = index.spanByClip.get("c1")!;
      expect(Number(entry.span.start)).toBe(12);
      expect(Number(entry.span.start) + Number(entry.span.size)).toBe(20);
    });

    it("no-op for unknown clip", () => {
      const index = BucketIndex.make(BAR);
      const v = index.version;
      BucketIndex.moveClip(index, "unknown", QN(5));
      expect(index.version).toBe(v);
    });
  });

  describe("resizeClip", () => {
    it("resizes a clip within same buckets", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));
      const v = index.version;

      // Resize: still within bucket 0
      BucketIndex.resizeClip(index, "c1", span(0, 2));

      const entry = index.spanByClip.get("c1")!;
      expect(Number(entry.span.start)).toBe(0);
      expect(Number(entry.span.start) + Number(entry.span.size)).toBe(2);
      expect(index.version).toBe(v + 1);
    });

    it("resizes a clip to span more buckets", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 3));

      // Resize to span 3 buckets
      BucketIndex.resizeClip(index, "c1", span(0, 10));

      const trackMap = index.byTrack.get("t1")!;
      expect(trackMap.get(0)?.has("c1")).toBe(true);
      expect(trackMap.get(1)?.has("c1")).toBe(true);
      expect(trackMap.get(2)?.has("c1")).toBe(true);
    });

    it("resizes a clip to span fewer buckets", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 10));

      BucketIndex.resizeClip(index, "c1", span(0, 3));

      const trackMap = index.byTrack.get("t1")!;
      expect(trackMap.get(0)?.has("c1")).toBe(true);
      expect(trackMap.get(1)).toBeUndefined();
      expect(trackMap.get(2)).toBeUndefined();
    });
  });

  describe("fromClips", () => {
    it("builds an index from an array of clips", () => {
      const clips = [
        makeClip("c1", "t1", 0, 4),
        makeClip("c2", "t1", 8, 4),
        makeClip("c3", "t2", 0, 8),
      ];

      const index = BucketIndex.fromClips(clips, BAR);

      expect(index.spanByClip.size).toBe(3);
      expect(index.byTrack.size).toBe(2);
      expect(index.byTrack.get("t1")?.get(0)?.has("c1")).toBe(true);
      expect(index.byTrack.get("t1")?.get(2)?.has("c2")).toBe(true);
      expect(index.byTrack.get("t2")?.get(0)?.has("c3")).toBe(true);
      expect(index.byTrack.get("t2")?.get(1)?.has("c3")).toBe(true);
    });
  });

  describe("queryTrack", () => {
    it("returns clips overlapping the query range", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));
      BucketIndex.addClip(index, makeClip("c2", "t1", 4, 4));
      BucketIndex.addClip(index, makeClip("c3", "t1", 8, 4));

      // Query [2, 6) should overlap c1 and c2
      const result = BucketIndex.queryTrack(index, "t1", span(2, 6));
      expect(result.sort()).toEqual(["c1", "c2"]);
    });

    it("excludes clips that end exactly at query start", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));

      // Query [4, 8) — c1 ends at 4, no overlap
      const result = BucketIndex.queryTrack(index, "t1", span(4, 8));
      expect(result).toEqual([]);
    });

    it("excludes clips that start exactly at query end", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 4, 4));

      // Query [0, 4) — c1 starts at 4, no overlap
      const result = BucketIndex.queryTrack(index, "t1", span(0, 4));
      expect(result).toEqual([]);
    });

    it("returns empty array for empty track", () => {
      const index = BucketIndex.make(BAR);
      const result = BucketIndex.queryTrack(index, "t1", span(0, 100));
      expect(result).toEqual([]);
    });

    it("returns empty array for invalid range", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));
      expect(BucketIndex.queryTrack(index, "t1", span(5, 5))).toEqual([]);
      expect(BucketIndex.queryTrack(index, "t1", span(5, 3))).toEqual([]);
    });

    it("handles fractional QN positions", () => {
      const index = BucketIndex.make(BAR);
      // Clip at [1.5, 5.5)
      BucketIndex.addClip(index, makeClip("c1", "t1", 1.5, 4));

      // Query [0, 2) should overlap
      expect(BucketIndex.queryTrack(index, "t1", span(0, 2))).toEqual(["c1"]);
      // Query [5, 6) should overlap
      expect(BucketIndex.queryTrack(index, "t1", span(5, 6))).toEqual(["c1"]);
      // Query [5.5, 6) should NOT overlap (c1 ends at 5.5)
      expect(BucketIndex.queryTrack(index, "t1", span(5.5, 6))).toEqual([]);
    });

    it("deduplicates clips spanning multiple queried buckets", () => {
      const index = BucketIndex.make(BAR);
      // Clip spanning buckets 0, 1, 2
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 10));

      // Query spanning multiple buckets
      const result = BucketIndex.queryTrack(index, "t1", span(0, 10));
      expect(result).toEqual(["c1"]);
    });

    it("only returns clips from the queried track", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));
      BucketIndex.addClip(index, makeClip("c2", "t2", 0, 4));

      const result = BucketIndex.queryTrack(index, "t1", span(0, 4));
      expect(result).toEqual(["c1"]);
    });
  });

  describe("queryTracks", () => {
    it("returns clips for multiple tracks", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));
      BucketIndex.addClip(index, makeClip("c2", "t2", 0, 4));
      BucketIndex.addClip(index, makeClip("c3", "t3", 0, 4));

      const result = BucketIndex.queryTracks(index, ["t1", "t2"], span(0, 4));

      expect(result.size).toBe(2);
      expect(result.get("t1")).toEqual(["c1"]);
      expect(result.get("t2")).toEqual(["c2"]);
      expect(result.has("t3")).toBe(false);
    });

    it("omits tracks with no matching clips", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));

      const result = BucketIndex.queryTracks(index, ["t1", "t2"], span(0, 4));

      expect(result.size).toBe(1);
      expect(result.has("t2")).toBe(false);
    });
  });

  describe("event integration", () => {
    it("onClipCreated adds clip to index", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.onClipCreated(index, makeClip("c1", "t1", 0, 8));

      expect(index.spanByClip.has("c1")).toBe(true);
      expect(BucketIndex.queryTrack(index, "t1", span(0, 8))).toEqual(["c1"]);
    });

    it("onClipDeleted removes clip from index", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.onClipCreated(index, makeClip("c1", "t1", 0, 8));
      BucketIndex.onClipDeleted(index, "c1");

      expect(index.spanByClip.has("c1")).toBe(false);
      expect(BucketIndex.queryTrack(index, "t1", span(0, 8))).toEqual([]);
    });

    it("onClipMoved updates clip position", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.onClipCreated(index, makeClip("c1", "t1", 0, 4));

      BucketIndex.onClipMoved(index, "c1", QN(8));

      expect(BucketIndex.queryTrack(index, "t1", span(0, 4))).toEqual([]);
      expect(BucketIndex.queryTrack(index, "t1", span(8, 12))).toEqual(["c1"]);
    });

    it("onClipMoved with track change", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.onClipCreated(index, makeClip("c1", "t1", 0, 4));

      BucketIndex.onClipMoved(index, "c1", QN(0), "t2");

      expect(BucketIndex.queryTrack(index, "t1", span(0, 4))).toEqual([]);
      expect(BucketIndex.queryTrack(index, "t2", span(0, 4))).toEqual(["c1"]);
    });

    it("onClipResized updates clip span", () => {
      const index = BucketIndex.make(BAR);
      BucketIndex.onClipCreated(index, makeClip("c1", "t1", 0, 4));

      BucketIndex.onClipResized(index, "c1", { start: QN(0), size: QN(12) });

      // Now spans 3 buckets
      expect(BucketIndex.queryTrack(index, "t1", span(8, 12))).toEqual(["c1"]);
    });
  });

  describe("visibleTrackSlice", () => {
    const tracks = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"];

    it("returns all tracks when viewport fits them all", () => {
      const result = BucketIndex.visibleTrackSlice(tracks, 0, 800, 100);
      expect(result).toEqual(tracks);
    });

    it("returns visible subset when scrolled", () => {
      // scrollTop=200, viewport=300, rowHeight=100 → rows 2..4
      const result = BucketIndex.visibleTrackSlice(tracks, 200, 300, 100);
      expect(result).toEqual(["t2", "t3", "t4"]);
    });

    it("handles partial rows", () => {
      // scrollTop=150, viewport=200, rowHeight=100 → row0=1, row1=ceil(350/100)=4
      const result = BucketIndex.visibleTrackSlice(tracks, 150, 200, 100);
      expect(result).toEqual(["t1", "t2", "t3"]);
    });

    it("clamps to array bounds", () => {
      const result = BucketIndex.visibleTrackSlice(tracks, 600, 500, 100);
      expect(result).toEqual(["t6", "t7"]);
    });

    it("returns empty for zero row height", () => {
      const result = BucketIndex.visibleTrackSlice(tracks, 0, 300, 0);
      expect(result).toEqual([]);
    });
  });

  describe("version tracking", () => {
    it("increments on every mutation", () => {
      const index = BucketIndex.make(BAR);
      expect(index.version).toBe(0);

      BucketIndex.addClip(index, makeClip("c1", "t1", 0, 4));
      expect(index.version).toBe(1);

      BucketIndex.moveClip(index, "c1", QN(4));
      expect(index.version).toBe(2);

      BucketIndex.resizeClip(index, "c1", span(4, 10));
      expect(index.version).toBe(3);

      BucketIndex.removeClip(index, "c1");
      expect(index.version).toBe(4);
    });
  });

  describe("stress: many clips", () => {
    it("handles 1000 clips across 10 tracks", () => {
      const index = BucketIndex.make(BAR);
      const numTracks = 10;
      const clipsPerTrack = 100;

      // Add 1000 clips, each 4 QN long, spaced 4 QN apart
      for (let t = 0; t < numTracks; t++) {
        for (let c = 0; c < clipsPerTrack; c++) {
          const start = c * 4;
          BucketIndex.addClip(index, makeClip(`c${t}-${c}`, `t${t}`, start, 4));
        }
      }

      expect(index.spanByClip.size).toBe(1000);

      // Query a small window on one track
      const result = BucketIndex.queryTrack(index, "t0", span(8, 16));
      expect(result.sort()).toEqual(["c0-2", "c0-3"]);

      // Multi-track query
      const multiResult = BucketIndex.queryTracks(index, ["t0", "t1"], span(0, 8));
      expect(multiResult.get("t0")?.sort()).toEqual(["c0-0", "c0-1"]);
      expect(multiResult.get("t1")?.sort()).toEqual(["c1-0", "c1-1"]);
    });
  });
});
