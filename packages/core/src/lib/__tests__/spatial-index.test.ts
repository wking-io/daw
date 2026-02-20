import { describe, expect, it } from "bun:test";
import * as Numeric from "../numeric";
import * as SI from "../spatial-index";

const N = Numeric.Default;
const BUCKET = 4;

const idx = () => SI.make(N, BUCKET);

describe("lib/spatial-index", () => {
  describe("make", () => {
    it("creates an empty index", () => {
      const index = idx();
      expect(index.entries.size).toBe(0);
      expect(index.byGroup.size).toBe(0);
      expect(index.version).toBe(0);
    });
  });

  describe("add", () => {
    it("adds an item and increments version", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 3 });
      expect(index.entries.size).toBe(1);
      expect(index.version).toBe(1);
    });

    it("adds items to different groups", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 3 });
      SI.add(index, "g2", "b", { start: 0, size: 3 });
      expect(index.byGroup.size).toBe(2);
      expect(index.entries.size).toBe(2);
    });

    it("adds items to the same group", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 3 });
      SI.add(index, "g1", "b", { start: 5, size: 3 });
      expect(index.byGroup.size).toBe(1);
      expect(index.entries.size).toBe(2);
    });
  });

  describe("remove", () => {
    it("removes an existing item", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 3 });
      SI.remove(index, "a");
      expect(index.entries.size).toBe(0);
    });

    it("cleans up empty group maps", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 3 });
      SI.remove(index, "a");
      expect(index.byGroup.has("g1")).toBe(false);
    });

    it("no-ops for unknown id", () => {
      const index = idx();
      const v = index.version;
      SI.remove(index, "nope");
      expect(index.version).toBe(v);
    });

    it("does not affect other items in the same group", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 3 });
      SI.add(index, "g1", "b", { start: 5, size: 3 });
      SI.remove(index, "a");
      expect(index.entries.size).toBe(1);
      expect(SI.query(index, "g1", { start: 0, size: 20 })).toEqual(["b"]);
    });
  });

  describe("move", () => {
    it("changes the item position", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 4 });
      SI.move(index, "a", 10);
      // Should now be at [10, 14), not at [0, 4)
      expect(SI.query(index, "g1", { start: 0, size: 4 })).toEqual([]);
      expect(SI.query(index, "g1", { start: 9, size: 6 })).toEqual(["a"]);
    });

    it("can change group", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 4 });
      SI.move(index, "a", 0, "g2");
      expect(SI.query(index, "g1", { start: 0, size: 100 })).toEqual([]);
      expect(SI.query(index, "g2", { start: 0, size: 100 })).toEqual(["a"]);
    });

    it("no-ops for unknown id", () => {
      const index = idx();
      const v = index.version;
      SI.move(index, "nope", 5);
      expect(index.version).toBe(v);
    });

    it("preserves size", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 6 });
      SI.move(index, "a", 10);
      // Item at [10, 16). Query [15, 17) should hit it.
      expect(SI.query(index, "g1", { start: 15, size: 2 })).toEqual(["a"]);
      // Query [16, 18) should miss (half-open).
      expect(SI.query(index, "g1", { start: 16, size: 2 })).toEqual([]);
    });
  });

  describe("resize", () => {
    it("changes span to the given one", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 4 });
      SI.resize(index, "a", { start: 0, size: 12 });
      // Now spans [0, 12). Query [10, 13) should hit.
      expect(SI.query(index, "g1", { start: 10, size: 3 })).toEqual(["a"]);
    });

    it("shrinking removes from old buckets", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 12 });
      SI.resize(index, "a", { start: 0, size: 2 });
      // No longer spans [10, 13).
      expect(SI.query(index, "g1", { start: 10, size: 3 })).toEqual([]);
      // Still at [0, 2).
      expect(SI.query(index, "g1", { start: 0, size: 3 })).toEqual(["a"]);
    });

    it("no-ops for unknown id", () => {
      const index = idx();
      const v = index.version;
      SI.resize(index, "nope", { start: 0, size: 5 });
      expect(index.version).toBe(v);
    });
  });

  describe("query", () => {
    it("returns empty for empty index", () => {
      const index = idx();
      expect(SI.query(index, "g1", { start: 0, size: 10 })).toEqual([]);
    });

    it("returns empty for non-existent group", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 5 });
      expect(SI.query(index, "g2", { start: 0, size: 10 })).toEqual([]);
    });

    it("finds items overlapping the view", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 5 });
      SI.add(index, "g1", "b", { start: 10, size: 5 });
      SI.add(index, "g1", "c", { start: 20, size: 5 });

      const result = SI.query(index, "g1", { start: 3, size: 10 });
      expect(result.sort()).toEqual(["a", "b"]);
    });

    it("excludes items that don't overlap (half-open)", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 5 });
      // View starts exactly where item ends — no overlap for half-open [0,5) vs [5,10)
      expect(SI.query(index, "g1", { start: 5, size: 5 })).toEqual([]);
    });

    it("includes items that partially overlap", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 10 });
      // View [8, 12) overlaps [0, 10) at [8, 10)
      expect(SI.query(index, "g1", { start: 8, size: 4 })).toEqual(["a"]);
    });

    it("handles items spanning many buckets", () => {
      const index = idx();
      // With bucket size 4, this spans buckets 0–4
      SI.add(index, "g1", "big", { start: 0, size: 20 });
      expect(SI.query(index, "g1", { start: 18, size: 3 })).toEqual(["big"]);
      expect(SI.query(index, "g1", { start: 20, size: 3 })).toEqual([]);
    });

    it("does not return duplicates for multi-bucket items", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 20 });
      const result = SI.query(index, "g1", { start: 0, size: 20 });
      expect(result).toEqual(["a"]);
    });

    it("isolates groups", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 10 });
      SI.add(index, "g2", "b", { start: 0, size: 10 });
      expect(SI.query(index, "g1", { start: 0, size: 10 })).toEqual(["a"]);
      expect(SI.query(index, "g2", { start: 0, size: 10 })).toEqual(["b"]);
    });
  });

  describe("queryGroups", () => {
    it("returns empty map for empty index", () => {
      const index = idx();
      expect(SI.queryGroups(index, ["g1", "g2"], { start: 0, size: 10 })).toEqual(new Map());
    });

    it("returns results keyed by group", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 5 });
      SI.add(index, "g2", "b", { start: 0, size: 5 });
      SI.add(index, "g2", "c", { start: 3, size: 5 });

      const result = SI.queryGroups(index, ["g1", "g2"], { start: 0, size: 10 });
      expect(result.get("g1")!.sort()).toEqual(["a"]);
      expect(result.get("g2")!.sort()).toEqual(["b", "c"]);
    });

    it("omits groups with no results", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 5 });

      const result = SI.queryGroups(index, ["g1", "g2"], { start: 0, size: 10 });
      expect(result.has("g1")).toBe(true);
      expect(result.has("g2")).toBe(false);
    });

    it("only queries requested groups", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 5 });
      SI.add(index, "g2", "b", { start: 0, size: 5 });

      const result = SI.queryGroups(index, ["g1"], { start: 0, size: 10 });
      expect(result.has("g1")).toBe(true);
      expect(result.has("g2")).toBe(false);
    });
  });

  describe("version tracking", () => {
    it("increments on add, remove, move, resize", () => {
      const index = idx();
      expect(index.version).toBe(0);
      SI.add(index, "g1", "a", { start: 0, size: 5 });
      expect(index.version).toBe(1);
      SI.move(index, "a", 10);
      expect(index.version).toBe(2);
      SI.resize(index, "a", { start: 10, size: 8 });
      expect(index.version).toBe(3);
      SI.remove(index, "a");
      expect(index.version).toBe(4);
    });
  });

  describe("laws", () => {
    it("add then remove is identity", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 5, size: 10 });
      SI.remove(index, "a");
      expect(index.entries.size).toBe(0);
      expect(SI.query(index, "g1", { start: 0, size: 100 })).toEqual([]);
    });

    it("move preserves queryability", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 4 });
      SI.move(index, "a", 50);
      expect(SI.query(index, "g1", { start: 49, size: 6 })).toEqual(["a"]);
    });

    it("query result is subset of group items", () => {
      const index = idx();
      const ids = ["a", "b", "c", "d", "e"];
      for (let i = 0; i < ids.length; i++) {
        SI.add(index, "g1", ids[i]!, { start: i * 10, size: 5 });
      }
      const result = SI.query(index, "g1", { start: 15, size: 10 });
      for (const id of result) {
        expect(ids).toContain(id);
      }
    });

    it("every queried item actually overlaps the view", () => {
      const index = idx();
      SI.add(index, "g1", "a", { start: 0, size: 8 });
      SI.add(index, "g1", "b", { start: 5, size: 8 });
      SI.add(index, "g1", "c", { start: 20, size: 3 });

      const view = { start: 3, size: 7 };
      const result = SI.query(index, "g1", view);
      const viewEnd = view.start + view.size;

      for (const id of result) {
        const entry = index.entries.get(id)!;
        const entryEnd = entry.span.start + entry.span.size;
        expect(entry.span.start < viewEnd).toBe(true);
        expect(entryEnd > view.start).toBe(true);
      }
    });

    it("no missed items: items outside result don't overlap the view", () => {
      const index = idx();
      const spans: [string, number, number][] = [
        ["a", 0, 5],
        ["b", 4, 6],
        ["c", 12, 3],
        ["d", 20, 5],
        ["e", 24, 2],
      ];
      for (const [id, start, size] of spans) {
        SI.add(index, "g1", id, { start, size });
      }

      const view = { start: 3, size: 12 };
      const viewEnd = view.start + view.size;
      const result = new Set(SI.query(index, "g1", view));

      for (const [id, start, size] of spans) {
        const overlaps = start < viewEnd && start + size > view.start;
        expect(result.has(id)).toBe(overlaps);
      }
    });
  });
});
