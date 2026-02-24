// timeline.ts
import * as N from "./numeric";
import * as S from "./span";

export type Timeline<A extends number> = {
  size: A;
  view: S.Span<A>;
  min: A;
};

// ----- Well-formedness ------------------------------------------------------

export function isValid<A extends number>(t: Timeline<A>): boolean {
  const { size, view, min } = t;
  // contentSize >= 0
  if (N.lt(size, 0 as A)) return false;

  // minViewSize >= 0 and <= contentSize (allow ==0 if you truly want)
  if (N.lt(min, 0 as A)) return false;
  if (N.lt(size, min)) return false;

  // view.size in [minViewSize, contentSize]
  if (N.lt(view.size, min)) return false;
  if (N.lt(size, view.size)) return false;

  // view.start in [0, contentSize - view.size]
  const maxStart = N.subtract(size, view.size);
  if (N.lt(view.start, 0 as A)) return false;
  if (N.lt(maxStart, view.start)) return false;

  return true;
}

// ----- Normalization --------------------------------------------------------
// Canonical repair: clamp size, then clamp start.

export function normalize<A extends number>(t: Timeline<A>): Timeline<A> {
  const size = N.max(t.size, 0 as A);

  const min = N.clamp(t.min, 0 as A, size);

  const viewSize = N.clamp(t.view.size, min, size);
  const maxStart = N.subtract(size, viewSize);
  const start = N.clamp(t.view.start, 0 as A, maxStart);

  return { size, min, view: { start, size: viewSize } };
}

// Equivalence up to normalization
export function eq<A extends number>(a: Timeline<A>, b: Timeline<A>): boolean {
  const A1 = normalize(a);
  const B1 = normalize(b);
  return (
    N.eq(A1.size, B1.size) &&
    N.eq(A1.min, B1.min) &&
    N.eq(A1.view.start, B1.view.start) &&
    N.eq(A1.view.size, B1.view.size)
  );
}

// ----- Ops (closed over norm domain) ----------------------------------------

export function panBy<A extends number>(t: Timeline<A>, delta: A): Timeline<A> {
  const tt = normalize(t);
  const view = S.move(tt.view, delta);
  return normalize({ ...tt, view });
}

// Zoom factor: > 0. Convention: size' = size / factor (factor>1 zooms in)
export function zoomAt<A extends number>(
  t: Timeline<A>,
  factor: number,
  anchor: A,
): Timeline<A> {
  const tt = normalize(t);

  // Clamp anchor into content [0, contentSize] (anchor at end is allowed; treat it as position 1)
  const a = N.clamp(anchor, 0 as A, tt.size);

  // If size is 0 (only possible if minViewSize == 0), define anchorT = 0.
  if (N.eq(tt.view.size, 0 as A)) {
    const nextSize = N.divide(tt.view.size, factor);
    return normalize({ ...tt, view: S.withSize(tt.view, nextSize) });
  }

  const nextSizeRaw = N.divide(tt.view.size, factor);
  const nextSize = N.clamp(nextSizeRaw, tt.min, tt.size);

  // anchorT in [0..1] relative to current view
  const anchorT = N.divide(N.subtract(a, tt.view.start), tt.view.size);

  // nextStart = anchor - anchorT * nextSize
  const nextStart = N.subtract(a, N.multiply(anchorT, nextSize));

  return normalize({ ...tt, view: S.make(nextStart, nextSize) });
}

// Resize left/right by deltas in content units (positive means move edge right)
export function resizeLeftBy<A extends number>(
  t: Timeline<A>,
  delta: A,
): Timeline<A> {
  const tt = normalize(t);
  const v = tt.view;

  const nextSizeRaw = N.subtract(v.size, delta);
  const safeDelta = N.subtract(v.size, N.max(nextSizeRaw, tt.min));

  // Keep right edge fixed; adjust start -> start+delta and size -> size-delta
  const nextStart = N.add(v.start, safeDelta);
  const nextSize = N.subtract(v.size, safeDelta);
  return normalize({ ...tt, view: S.make(nextStart, nextSize) });
}

export function resizeRightBy<A extends number>(
  t: Timeline<A>,
  delta: A,
): Timeline<A> {
  const tt = normalize(t);
  const v = tt.view;
  // Keep left edge fixed; size -> size+delta
  const nextSize = N.add(v.size, delta);
  return normalize({ ...tt, view: S.withSize(v, nextSize) });
}
