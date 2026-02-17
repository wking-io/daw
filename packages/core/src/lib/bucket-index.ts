// bucket-index.ts — Per-track bucket index for fast clip overlap queries.
//
// Clips are indexed into fixed-size buckets (default: 1 bar in QN).
// Queries scan only the buckets that overlap the requested time range,
// then do a precise overlap test against stored spans.
//
// All mutations are O(buckets touched). Queries are O(buckets in window + results).

import * as QN from "./qn";
import * as Span from "./span";
import * as Range from "./range";
import { Default as NumericDefault } from "./numeric";
import type { Clip } from "@core/domain/clip";



// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClipSpan = {
  trackId: string;
  bucketRange: Range.Range<number>
  span: Span.Span<QN.QN>
};

export type BucketIndex = {
  /** Bucket width in QN (e.g. 4 for one bar of 4/4) */
  readonly bucketSize: number;
  /** trackId → bucketKey → set of clipIds */
  readonly byTrack: Map<string, Map<number, Set<string>>>;
  /** clipId → span metadata (used for efficient removal/update) */
  readonly spanByClip: Map<string, ClipSpan>;
  /** Monotonically increasing version; bumped on every mutation */
  version: number;
};

// ---------------------------------------------------------------------------
// Bucket math
// ---------------------------------------------------------------------------

function bucketFor(pos: number, bucketSize: number): number {
  return Math.floor(pos / bucketSize);
}

// end is exclusive — the last occupied bucket contains (end - ε).
// ceil(end / bucketSize) - 1 handles both exact-boundary and mid-bucket cases.
function bucketForEnd(end: number, bucketSize: number): number {
  return Math.ceil(end / bucketSize) - 1;
}

/** Compute the inclusive [b0, b1] bucket range for a half-open span [start, end). */
function bucketRange(
  view: Span.Span<QN.QN>,
  bucketSize: number,
): Range.Range<number> {
  const b0 = bucketFor(view.start, bucketSize);
  const b1 = bucketForEnd(Span.end(QN.Numeric, view), bucketSize);
  return Range.make(NumericDefault, b0, b1);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getOrCreateTrackMap(index: BucketIndex, trackId: string): Map<number, Set<string>> {
  let trackMap = index.byTrack.get(trackId);
  if (!trackMap) {
    trackMap = new Map();
    index.byTrack.set(trackId, trackMap);
  }
  return trackMap;
}

function insertIntoBuckets(
  trackMap: Map<number, Set<string>>,
  clipId: string,
  bucket: Range.Range<number>,
): void {
  for (let b = bucket.start; b <= bucket.end; b++) {
    let bucket = trackMap.get(b);
    if (!bucket) {
      bucket = new Set();
      trackMap.set(b, bucket);
    }
    bucket.add(clipId);
  }
}

function removeFromBuckets(
  trackMap: Map<number, Set<string>>,
  clipId: string,
  buckets: Range.Range<number>
): void {
  for (let b = buckets.start; b <= buckets.end; b++) {
    const bucket = trackMap.get(b);
    if (bucket) {
      bucket.delete(clipId);
      if (bucket.size === 0) trackMap.delete(b);
    }
  }
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

/** Create an empty BucketIndex with the given bucket size (in QN). */
export function make(bucketSize: number): BucketIndex {
  return {
    bucketSize,
    byTrack: new Map(),
    spanByClip: new Map(),
    version: 0,
  };
}

/** Build an index from an array of clips. */
export function fromClips(
  clips: ReadonlyArray<Clip>,
  bucketSize: number,
): BucketIndex {
  const index = make(bucketSize);
  for (const clip of clips) {
    addClip(
      index,
      clip,
    );
  }
  return index;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Add a clip to the index. */
export function addClip(
  index: BucketIndex,
  clip: Clip,
): void {
  const br = bucketRange(clip.span, index.bucketSize);

  const trackMap = getOrCreateTrackMap(index, clip.trackId);
  insertIntoBuckets(trackMap, clip.id, br);
  index.spanByClip.set(clip.id, { trackId: clip.trackId, bucketRange: br, span: clip.span });
  index.version++;
}

/** Remove a clip from the index. */
export function removeClip(index: BucketIndex, clipId: string): void {
  const clip = index.spanByClip.get(clipId);
  if (!clip) return;

  const trackMap = index.byTrack.get(clip.trackId);
  if (trackMap) {
    removeFromBuckets(trackMap, clipId, clip.bucketRange);
    if (trackMap.size === 0) index.byTrack.delete(clip.trackId);
  }
  index.spanByClip.delete(clipId);
  index.version++;
}

/** Move a clip to a new start position and optionally a new track. */
export function moveClip(
  index: BucketIndex,
  clipId: string,
  newStart: QN.QN,
  newTrackId?: string,
): void {
  const old = index.spanByClip.get(clipId);
  if (!old) return;

  const newSpan = Span.move(QN.Numeric, old.span, QN.subtract(newStart, old.span.start));
  const trackId = newTrackId ?? old.trackId;
  const newRange = bucketRange(newSpan, index.bucketSize);

  // If track changed or bucket span changed, update buckets
  const trackChanged = trackId !== old.trackId;
  const bucketsChanged = !Range.eq(NumericDefault, old.bucketRange, newRange);

  if (trackChanged || bucketsChanged) {
    // Remove from old buckets
    const oldTrackMap = index.byTrack.get(old.trackId);
    if (oldTrackMap) {
      removeFromBuckets(oldTrackMap, clipId, old.bucketRange);
      if (oldTrackMap.size === 0) index.byTrack.delete(old.trackId);
    }

    // Insert into new buckets
    const newTrackMap = getOrCreateTrackMap(index, trackId);
    insertIntoBuckets(newTrackMap, clipId, newRange);
  }

  index.spanByClip.set(clipId, {
    trackId,
    bucketRange: newRange,
    span: newSpan,
  });
  index.version++;
}

/** Resize a clip to a new span. */
export function resizeClip(index: BucketIndex, clipId: string, span: Span.Span<QN.QN>): void {
  const old = index.spanByClip.get(clipId);
  if (!old) return;

  const newRange = bucketRange(span, index.bucketSize);
  const bucketsChanged = !Range.eq(NumericDefault, old.bucketRange, newRange);

  if (bucketsChanged) {
    const trackMap = index.byTrack.get(old.trackId);
    if (trackMap) {
      removeFromBuckets(trackMap, clipId, old.bucketRange);
    }

    const newTrackMap = getOrCreateTrackMap(index, old.trackId);
    insertIntoBuckets(newTrackMap, clipId, newRange);
  }

  index.spanByClip.set(clipId, {
    trackId: old.trackId,
    bucketRange: newRange,
    span,
  });
  index.version++;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Query all clip IDs on a track that overlap the half-open range [t0, t1). */
export function queryTrack(index: BucketIndex, trackId: string, view: Span.Span<QN.QN>): string[] {
  const trackMap = index.byTrack.get(trackId);
  if (!trackMap) return [];

  const queryBucketRange = bucketRange(view, index.bucketSize)

  // Collect candidates from buckets
  const candidates = new Set<string>();
  for (let b = queryBucketRange.start; b <= queryBucketRange.end; b++) {
    const bucket = trackMap.get(b);
    if (bucket) {
      for (const clipId of bucket) {
        candidates.add(clipId);
      }
    }
  }

  // Precise overlap test: clip.start < t1 && clip.end > t0
  const result: string[] = [];
  for (const clipId of candidates) {
    const clip = index.spanByClip.get(clipId)!;
    if (QN.lt(clip.span.start, Span.end(QN.Numeric, view)) && QN.gt(Span.end(QN.Numeric, clip.span), view.start)) {
      result.push(clipId);
    }
  }

  return result;
}

/**
 * Query multiple tracks for clips overlapping [t0, t1).
 * Returns a Map from trackId to matching clip IDs.
 */
export function queryTracks(
  index: BucketIndex,
  trackIds: ReadonlyArray<string>,
  view: Span.Span<QN.QN>
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const trackId of trackIds) {
    const clips = queryTrack(index, trackId, view);
    if (clips.length > 0) {
      result.set(trackId, clips);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Clip event integration
// ---------------------------------------------------------------------------

/** Apply a clip.created event to the index. */
export function onClipCreated(
  index: BucketIndex,
  clip: Clip,
): void {
  addClip(index, clip);
}

/** Apply a clip.deleted event to the index. */
export function onClipDeleted(index: BucketIndex, clipId: string): void {
  removeClip(index, clipId);
}

/** Apply a clip.moved event to the index. */
export function onClipMoved(
  index: BucketIndex,
  clipId: string,
  newStart: QN.QN,
  newTrackId?: string,
): void {
  moveClip(index, clipId, newStart, newTrackId);
}

/** Apply a clip.resized event to the index. */
export function onClipResized(
  index: BucketIndex,
  clipId: string,
  newSpan: Span.Span<QN.QN>,
): void {
  resizeClip(index, clipId, newSpan);
}

// ---------------------------------------------------------------------------
// Visible tracks helper
// ---------------------------------------------------------------------------

/** Compute the slice of visible track IDs given vertical scroll state. */
export function visibleTrackSlice(
  trackIds: ReadonlyArray<string>,
  scrollTopPx: number,
  viewportHeightPx: number,
  rowHeightPx: number,
): string[] {
  if (rowHeightPx <= 0) return [];
  const row0 = Math.floor(scrollTopPx / rowHeightPx);
  const row1 = Math.ceil((scrollTopPx + viewportHeightPx) / rowHeightPx);
  return trackIds.slice(Math.max(0, row0), Math.min(trackIds.length, row1));
}
