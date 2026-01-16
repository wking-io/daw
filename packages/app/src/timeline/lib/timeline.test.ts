import { describe, expect, it } from "vitest";
import * as Px from "./px";
import * as Span from "./span";
import * as Timeline from "./timeline";

const N = Px.Numeric;

// Helper to create a valid Timeline
function makeTimeline(
	size: number,
	viewStart: number,
	viewSize: number,
	min: number = 0,
): Timeline.Timeline<Px.Px> {
	return {
		size: Px.Px(size),
		view: Span.make(N, viewStart, viewSize),
		min: Px.Px(min),
	};
}

describe("timeline/lib/timeline", () => {
	describe("isValid", () => {
		it("returns true for a valid timeline", () => {
			const t = makeTimeline(100, 10, 20, 10);
			expect(Timeline.isValid(N, t)).toBe(true);
		});

		it("returns false when size < 0", () => {
			const t = makeTimeline(-10, 0, 10, 0);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns false when min < 0", () => {
			const t = makeTimeline(100, 0, 20, -5);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns false when min > size", () => {
			const t = makeTimeline(50, 0, 50, 100);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns false when view.size < min", () => {
			const t = makeTimeline(100, 0, 5, 10);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns false when view.size > size", () => {
			const t = makeTimeline(50, 0, 100, 10);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns false when view.start < 0", () => {
			const t = makeTimeline(100, -10, 20, 10);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns false when view.start > size - view.size", () => {
			// size=100, view.size=20 -> maxStart=80; start=90 is invalid
			const t = makeTimeline(100, 90, 20, 10);
			expect(Timeline.isValid(N, t)).toBe(false);
		});

		it("returns true for edge case: view fills entire content", () => {
			const t = makeTimeline(100, 0, 100, 10);
			expect(Timeline.isValid(N, t)).toBe(true);
		});

		it("returns true for edge case: zero-size content and view", () => {
			const t = makeTimeline(0, 0, 0, 0);
			expect(Timeline.isValid(N, t)).toBe(true);
		});
	});

	describe("normalize", () => {
		it("returns the same timeline when already valid", () => {
			const t = makeTimeline(100, 10, 20, 10);
			const normalized = Timeline.normalize(N, t);
			expect(normalized).toEqual(t);
		});

		it("clamps negative size to zero", () => {
			const t = makeTimeline(-50, 0, 10, 5);
			const normalized = Timeline.normalize(N, t);
			expect(normalized.size).toBe(Px.Px(0));
		});

		it("clamps min to [0, size]", () => {
			const t = makeTimeline(50, 0, 50, 100);
			const normalized = Timeline.normalize(N, t);
			expect(normalized.min).toBe(Px.Px(50));
		});

		it("clamps view.size to [min, size]", () => {
			// view.size=5 is below min=10, should be clamped to 10
			const t = makeTimeline(100, 0, 5, 10);
			const normalized = Timeline.normalize(N, t);
			expect(normalized.view.size).toBe(Px.Px(10));
		});

		it("clamps view.start to [0, size - view.size]", () => {
			// start=90 with size=20 exceeds maxStart=80
			const t = makeTimeline(100, 90, 20, 10);
			const normalized = Timeline.normalize(N, t);
			expect(normalized.view.start).toBe(Px.Px(80));
		});

		it("handles negative view.start", () => {
			const t = makeTimeline(100, -20, 30, 10);
			const normalized = Timeline.normalize(N, t);
			expect(normalized.view.start).toBe(Px.Px(0));
		});
	});

	describe("eq", () => {
		it("returns true for identical timelines", () => {
			const a = makeTimeline(100, 10, 20, 10);
			const b = makeTimeline(100, 10, 20, 10);
			expect(Timeline.eq(N, a, b)).toBe(true);
		});

		it("returns true for timelines equal after normalization", () => {
			const a = makeTimeline(100, 90, 20, 10); // start will be clamped to 80
			const b = makeTimeline(100, 80, 20, 10);
			expect(Timeline.eq(N, a, b)).toBe(true);
		});

		it("returns false for different timelines", () => {
			const a = makeTimeline(100, 10, 20, 10);
			const b = makeTimeline(100, 20, 20, 10);
			expect(Timeline.eq(N, a, b)).toBe(false);
		});
	});

	describe("panBy", () => {
		it("moves view by positive delta", () => {
			const t = makeTimeline(100, 10, 20, 10);
			const panned = Timeline.panBy(N, t, Px.Px(5));
			expect(panned.view.start).toBe(Px.Px(15));
			expect(panned.view.size).toBe(Px.Px(20));
		});

		it("moves view by negative delta", () => {
			const t = makeTimeline(100, 20, 20, 10);
			const panned = Timeline.panBy(N, t, Px.Px(-10));
			expect(panned.view.start).toBe(Px.Px(10));
			expect(panned.view.size).toBe(Px.Px(20));
		});

		it("clamps view to not exceed right edge", () => {
			const t = makeTimeline(100, 10, 20, 10);
			// maxStart = 100 - 20 = 80
			const panned = Timeline.panBy(N, t, Px.Px(100));
			expect(panned.view.start).toBe(Px.Px(80));
			expect(panned.view.size).toBe(Px.Px(20));
		});

		it("clamps view to not go below left edge", () => {
			const t = makeTimeline(100, 10, 20, 10);
			const panned = Timeline.panBy(N, t, Px.Px(-100));
			expect(panned.view.start).toBe(Px.Px(0));
			expect(panned.view.size).toBe(Px.Px(20));
		});
	});

	describe("zoomAt", () => {
		it("zooms in (factor > 1) at anchor point", () => {
			// view [10, 30), size=20, anchor=20 (middle of view)
			const t = makeTimeline(100, 10, 20, 5);
			const anchor = Px.Px(20);

			// factor 2 => newSize = 20/2 = 10
			// anchorT = (20 - 10) / 20 = 0.5
			// newStart = 20 - 0.5 * 10 = 15
			const zoomed = Timeline.zoomAt(N, t, 2, anchor);
			expect(zoomed.view.size).toBe(Px.Px(10));
			expect(zoomed.view.start).toBe(Px.Px(15));
		});

		it("zooms out (factor < 1) at anchor point", () => {
			const t = makeTimeline(100, 20, 20, 10);
			const anchor = Px.Px(30); // middle of view [20, 40)

			// factor 0.5 => newSize = 20 / 0.5 = 40
			// anchorT = (30 - 20) / 20 = 0.5
			// newStart = 30 - 0.5 * 40 = 10
			const zoomed = Timeline.zoomAt(N, t, 0.5, anchor);
			expect(zoomed.view.size).toBe(Px.Px(40));
			expect(zoomed.view.start).toBe(Px.Px(10));
		});

		it("clamps zoomed view size to min", () => {
			const t = makeTimeline(100, 10, 20, 15);
			const anchor = Px.Px(20);

			// factor 10 => newSize = 20/10 = 2, but min=15
			const zoomed = Timeline.zoomAt(N, t, 10, anchor);
			expect(zoomed.view.size).toBe(Px.Px(15));
		});

		it("clamps zoomed view size to content size", () => {
			const t = makeTimeline(100, 10, 20, 10);
			const anchor = Px.Px(20);

			// factor 0.01 => newSize = 2000, clamped to 100
			const zoomed = Timeline.zoomAt(N, t, 0.01, anchor);
			expect(zoomed.view.size).toBe(Px.Px(100));
			expect(zoomed.view.start).toBe(Px.Px(0));
		});

		it("clamps anchor to content bounds", () => {
			const t = makeTimeline(100, 10, 20, 10);
			const anchor = Px.Px(150); // beyond content

			// Anchor should be clamped to 100
			const zoomed = Timeline.zoomAt(N, t, 2, anchor);
			expect(zoomed.view.size).toBe(Px.Px(10));
			// With anchor at 100, anchorT = (100-10)/20 = 4.5
			// newStart = 100 - 4.5 * 10 = 55, but will be normalized
		});

		it("handles zero view size edge case", () => {
			const t = makeTimeline(100, 50, 0, 0);
			const anchor = Px.Px(50);
			const zoomed = Timeline.zoomAt(N, t, 2, anchor);
			expect(zoomed.view.size).toBe(Px.Px(0));
		});
	});

	describe("resizeLeftBy", () => {
		it("shrinks view from left (positive delta)", () => {
			// view [10, 30) size=20, right edge at 30
			const t = makeTimeline(100, 10, 20, 5);
			const resized = Timeline.resizeLeftBy(N, t, Px.Px(5));
			// Moving left edge right by 5: start=15, size=15
			expect(resized.view.start).toBe(Px.Px(15));
			expect(resized.view.size).toBe(Px.Px(15));
		});

		it("expands view from left (negative delta)", () => {
			// view [10, 30) size=20
			const t = makeTimeline(100, 10, 20, 5);
			const resized = Timeline.resizeLeftBy(N, t, Px.Px(-5));
			// Moving left edge left by 5: start=5, size=25
			expect(resized.view.start).toBe(Px.Px(5));
			expect(resized.view.size).toBe(Px.Px(25));
		});

		it("clamps to min view size", () => {
			const t = makeTimeline(100, 10, 20, 15);
			// Try to shrink by 10, but min=15 so size can't go below 15
			const resized = Timeline.resizeLeftBy(N, t, Px.Px(10));
			expect(resized.view.size).toBe(Px.Px(15));
			expect(resized.view.start).toBe(Px.Px(15));
		});

		it("clamps view start to content bounds", () => {
			const t = makeTimeline(100, 10, 20, 5);
			// Try to expand left by 50, which would put start at -40
			const resized = Timeline.resizeLeftBy(N, t, Px.Px(-50));
			expect(resized.view.start).toBe(Px.Px(0));
			// After normalization, start is clamped to 0
		});
	});

	describe("resizeRightBy", () => {
		it("expands view from right (positive delta)", () => {
			// view [10, 30) size=20
			const t = makeTimeline(100, 10, 20, 5);
			const resized = Timeline.resizeRightBy(N, t, Px.Px(5));
			expect(resized.view.start).toBe(Px.Px(10));
			expect(resized.view.size).toBe(Px.Px(25));
		});

		it("shrinks view from right (negative delta)", () => {
			const t = makeTimeline(100, 10, 20, 5);
			const resized = Timeline.resizeRightBy(N, t, Px.Px(-5));
			expect(resized.view.start).toBe(Px.Px(10));
			expect(resized.view.size).toBe(Px.Px(15));
		});

		it("clamps to min view size", () => {
			const t = makeTimeline(100, 10, 20, 15);
			// Try to shrink by 10, min=15
			const resized = Timeline.resizeRightBy(N, t, Px.Px(-10));
			expect(resized.view.size).toBe(Px.Px(15));
		});

		it("clamps to content size", () => {
			const t = makeTimeline(100, 10, 20, 5);
			// Try to expand by 200, should clamp
			const resized = Timeline.resizeRightBy(N, t, Px.Px(200));
			expect(resized.view.size).toBe(Px.Px(100));
			// After normalization, view will be adjusted
		});
	});

	describe("viewRange", () => {
		it("converts view Span to Range", () => {
			const t = makeTimeline(100, 10, 20, 5);
			const range = Timeline.viewRange(N, t);
			expect(range.start).toBe(Px.Px(10));
			expect(range.end).toBe(Px.Px(30));
		});

		it("normalizes before converting", () => {
			// Invalid timeline: start=90, size=20 exceeds bounds
			const t = makeTimeline(100, 90, 20, 5);
			const range = Timeline.viewRange(N, t);
			// After normalization: start=80, size=20, end=100
			expect(range.start).toBe(Px.Px(80));
			expect(range.end).toBe(Px.Px(100));
		});
	});

	describe("fullRange", () => {
		it("returns range from 0 to size", () => {
			const t = makeTimeline(100, 10, 20, 5);
			const range = Timeline.fullRange(N, t);
			expect(range.start).toBe(Px.Px(0));
			expect(range.end).toBe(Px.Px(100));
		});

		it("normalizes size before creating range", () => {
			const t = makeTimeline(-50, 0, 10, 5);
			const range = Timeline.fullRange(N, t);
			expect(range.start).toBe(Px.Px(0));
			expect(range.end).toBe(Px.Px(0));
		});
	});
});
