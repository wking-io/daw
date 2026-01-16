// timeline.ts
import type { Numeric } from "./numeric";
import * as R from "./range";
import * as S from "./span";

export type Timeline<A extends number> = {
	size: A;
	view: S.Span<A>;
	min: A;
};

// ----- Well-formedness ------------------------------------------------------

export function isValid<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
): boolean {
	const { size, view, min } = t;
	// contentSize >= 0
	if (N.lt(size, N.zero)) return false;

	// minViewSize >= 0 and <= contentSize (allow ==0 if you truly want)
	if (N.lt(min, N.zero)) return false;
	if (N.lt(size, min)) return false;

	// view.size in [minViewSize, contentSize]
	if (N.lt(view.size, min)) return false;
	if (N.lt(size, view.size)) return false;

	// view.start in [0, contentSize - view.size]
	const maxStart = N.subtract(size, view.size);
	if (N.lt(view.start, N.zero)) return false;
	if (N.lt(maxStart, view.start)) return false;

	return true;
}

// ----- Normalization --------------------------------------------------------
// Canonical repair: clamp size, then clamp start.

export function normalize<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
): Timeline<A> {
	const size = N.max(t.size, N.zero);

	const min = N.clamp(t.min, N.zero, size);

	const viewSize = N.clamp(t.view.size, min, size);
	const maxStart = N.subtract(size, viewSize);
	const start = N.clamp(t.view.start, N.zero, maxStart);

	return { size, min, view: { start, size: viewSize } };
}

// Equivalence up to normalization
export function eq<A extends number>(
	N: Numeric<A>,
	a: Timeline<A>,
	b: Timeline<A>,
): boolean {
	const A1 = normalize(N, a);
	const B1 = normalize(N, b);
	return (
		N.eq(A1.size, B1.size) &&
		N.eq(A1.min, B1.min) &&
		N.eq(A1.view.start, B1.view.start) &&
		N.eq(A1.view.size, B1.view.size)
	);
}

// ----- Ops (closed over norm domain) ----------------------------------------

export function panBy<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
	delta: A,
): Timeline<A> {
	const tt = normalize(N, t);
	const view = S.move(N, tt.view, delta);
	return normalize(N, { ...tt, view });
}

// Zoom factor: > 0. Convention: size' = size / factor (factor>1 zooms in)
export function zoomAt<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
	factor: number,
	anchor: A,
): Timeline<A> {
	const tt = normalize(N, t);

	// Clamp anchor into content [0, contentSize] (anchor at end is allowed; treat it as position 1)
	const a = N.clamp(anchor, N.zero, tt.size);

	// If size is 0 (only possible if minViewSize == 0), define anchorT = 0.
	if (N.eq(tt.view.size, N.zero)) {
		const nextSize = N.divide(tt.view.size, factor);
		return normalize(N, { ...tt, view: S.withSize(tt.view, nextSize) });
	}

	const nextSizeRaw = N.divide(tt.view.size, factor);
	const nextSize = N.clamp(nextSizeRaw, tt.min, tt.size);

	// anchorT in [0..1] relative to current view
	const anchorT = N.divide(N.subtract(a, tt.view.start), tt.view.size);

	// nextStart = anchor - anchorT * nextSize
	const nextStart = N.subtract(a, N.multiply(anchorT, nextSize));

	return normalize(N, { ...tt, view: S.make(N, nextStart, nextSize) });
}

// Resize left/right by deltas in content units (positive means move edge right)
export function resizeLeftBy<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
	delta: A,
): Timeline<A> {
	const tt = normalize(N, t);
	const v = tt.view;

	const nextSizeRaw = N.subtract(v.size, delta);
	const safeDelta = N.subtract(v.size, N.max(nextSizeRaw, tt.min));

	// Keep right edge fixed; adjust start -> start+delta and size -> size-delta
	const nextStart = N.add(v.start, safeDelta);
	const nextSize = N.subtract(v.size, safeDelta);
	return normalize(N, { ...tt, view: S.make(N, nextStart, nextSize) });
}

export function resizeRightBy<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
	delta: A,
): Timeline<A> {
	const tt = normalize(N, t);
	const v = tt.view;
	// Keep left edge fixed; size -> size+delta
	const nextSize = N.add(v.size, delta);
	return normalize(N, { ...tt, view: S.withSize(v, nextSize) });
}

// Handy derived: view as Range if you need start/end
export function viewRange<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
): R.Range<A> {
	const tt = normalize(N, t);
	return S.toRange(N, tt.view);
}

export function fullRange<A extends number>(
	N: Numeric<A>,
	t: Timeline<A>,
): R.Range<A> {
	const tt = normalize(N, t);
	return R.make(N, N.zero, tt.size);
}
