// spatial-index.ts — Grouped bucketed spatial index for fast overlap queries.
//
// Items are identified by string IDs, organized into named groups, and
// positioned by Span<A>. Fixed-size buckets provide O(buckets) mutations
// and O(buckets in window + results) queries.

import * as N from "./numeric";
import * as Span from "./span";
import * as Range from "./range";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Entry<A extends number, G> = {
  group: G;
  bucketRange: Range.Range<number>;
  span: Span.Span<A>;
};

export type SpatialIndex<A extends number, I = string, G = string> = {
  readonly bucketSize: number;
  /** group → bucketKey → set of item IDs */
  readonly byGroup: Map<G, Map<number, Set<I>>>;
  /** itemId → entry metadata (used for efficient removal/update) */
  readonly entries: Map<I, Entry<A, G>>;
  /** Monotonically increasing version; bumped on every mutation */
  version: number;
};

// ---------------------------------------------------------------------------
// Bucket math
// ---------------------------------------------------------------------------

function bucketFor(pos: number, bucketSize: number): number {
  return Math.floor(pos / bucketSize);
}

function bucketForEnd(end: number, bucketSize: number): number {
  return Math.ceil(end / bucketSize) - 1;
}

function bucketRange<A extends number>(
  span: Span.Span<A>,
  bucketSize: number,
): Range.Range<number> {
  const b0 = bucketFor(span.start, bucketSize);
  const b1 = bucketForEnd(Span.end(span), bucketSize);
  return Range.make(b0, b1);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getOrCreateGroupMap<A extends number, I, G>(
  index: SpatialIndex<A, I, G>,
  group: G,
): Map<number, Set<I>> {
  let groupMap = index.byGroup.get(group);
  if (!groupMap) {
    groupMap = new Map();
    index.byGroup.set(group, groupMap);
  }
  return groupMap;
}

function insertIntoBuckets<I>(
  groupMap: Map<number, Set<I>>,
  id: I,
  range: Range.Range<number>,
): void {
  for (let b = range.start; b <= range.end; b++) {
    let bucket = groupMap.get(b);
    if (!bucket) {
      bucket = new Set();
      groupMap.set(b, bucket);
    }
    bucket.add(id);
  }
}

function removeFromBuckets<I>(
  groupMap: Map<number, Set<I>>,
  id: I,
  range: Range.Range<number>,
): void {
  for (let b = range.start; b <= range.end; b++) {
    const bucket = groupMap.get(b);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) groupMap.delete(b);
    }
  }
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

export function make<A extends number, I = string, G = string>(
  bucketSize: number,
): SpatialIndex<A, I, G> {
  return {
    bucketSize,
    byGroup: new Map(),
    entries: new Map(),
    version: 0,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function add<A extends number, I, G>(
  index: SpatialIndex<A, I, G>,
  group: G,
  id: I,
  span: Span.Span<A>,
): void {
  const br = bucketRange(span, index.bucketSize);
  const groupMap = getOrCreateGroupMap(index, group);
  insertIntoBuckets(groupMap, id, br);
  index.entries.set(id, { group, bucketRange: br, span });
  index.version++;
}

export function remove<A extends number, I, G>(index: SpatialIndex<A, I, G>, id: I): void {
  const entry = index.entries.get(id);
  if (!entry) return;

  const groupMap = index.byGroup.get(entry.group);
  if (groupMap) {
    removeFromBuckets(groupMap, id, entry.bucketRange);
    if (groupMap.size === 0) index.byGroup.delete(entry.group);
  }
  index.entries.delete(id);
  index.version++;
}

export function move<A extends number, I, G>(
  index: SpatialIndex<A, I, G>,
  id: I,
  newStart: A,
  newGroup?: G,
): void {
  const old = index.entries.get(id);
  if (!old) return;

  const newSpan = Span.move(old.span, N.subtract(newStart, old.span.start));
  const group = newGroup ?? old.group;
  const newRange = bucketRange(newSpan, index.bucketSize);

  const groupChanged = group !== old.group;
  const bucketsChanged = !Range.eq(old.bucketRange, newRange);

  if (groupChanged || bucketsChanged) {
    const oldGroupMap = index.byGroup.get(old.group);
    if (oldGroupMap) {
      removeFromBuckets(oldGroupMap, id, old.bucketRange);
      if (oldGroupMap.size === 0) index.byGroup.delete(old.group);
    }

    const newGroupMap = getOrCreateGroupMap(index, group);
    insertIntoBuckets(newGroupMap, id, newRange);
  }

  index.entries.set(id, { group, bucketRange: newRange, span: newSpan });
  index.version++;
}

export function resize<A extends number, I, G>(
  index: SpatialIndex<A, I, G>,
  id: I,
  span: Span.Span<A>,
): void {
  const old = index.entries.get(id);
  if (!old) return;

  const newRange = bucketRange(span, index.bucketSize);
  const bucketsChanged = !Range.eq(old.bucketRange, newRange);

  if (bucketsChanged) {
    const groupMap = index.byGroup.get(old.group);
    if (groupMap) {
      removeFromBuckets(groupMap, id, old.bucketRange);
    }

    const newGroupMap = getOrCreateGroupMap(index, old.group);
    insertIntoBuckets(newGroupMap, id, newRange);
  }

  index.entries.set(id, { group: old.group, bucketRange: newRange, span });
  index.version++;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function query<A extends number, I, G>(
  index: SpatialIndex<A, I, G>,
  group: G,
  view: Span.Span<A>,
): I[] {
  const groupMap = index.byGroup.get(group);
  if (!groupMap) return [];

  const queryBR = bucketRange(view, index.bucketSize);

  const candidates = new Set<I>();
  for (let b = queryBR.start; b <= queryBR.end; b++) {
    const bucket = groupMap.get(b);
    if (bucket) {
      for (const id of bucket) {
        candidates.add(id);
      }
    }
  }

  const result: I[] = [];
  for (const id of candidates) {
    const entry = index.entries.get(id)!;
    if (N.lt(entry.span.start, Span.end(view)) && N.gt(Span.end(entry.span), view.start)) {
      result.push(id);
    }
  }

  return result;
}

export function queryGroups<A extends number, I, G>(
  index: SpatialIndex<A, I, G>,
  groups: ReadonlyArray<G>,
  view: Span.Span<A>,
): Map<G, I[]> {
  const result = new Map<G, I[]>();
  for (const group of groups) {
    const items = query(index, group, view);
    if (items.length > 0) {
      result.set(group, items);
    }
  }
  return result;
}
