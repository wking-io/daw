import { describe, expect, it } from "vitest";
import * as Px from "./px";
import * as Range from "./range";
import * as Scroll from "./scroll";
import type * as Timeline from "./timeline";

describe("timeline/lib/scroll", () => {
	it("width returns full range width in screen px at given scale", () => {
		const full = Range.make(Px.Numeric, 10, 30); // width 20
		const scale = 3;
		const size = Range.length(Px.Numeric, full);
		expect(Scroll.width(Px.Numeric, size, scale)).toBe(Px.Px(60));
	});

	it("toScroll converts view.start into scroll px offset from full.start", () => {
		const t: Timeline.Timeline<Px.Px> = {
			size: Px.Px(100),
			view: { start: Px.Px(20), size: Px.Px(20) },
			min: Px.Px(10),
		};
		const scale = 2;
		expect(Scroll.toScroll(Px.Numeric, t.view.start, scale)).toBe(Px.Px(40));
	});

	it("fromScroll is inverse of toScroll (same scale and timeline.full)", () => {
		const t: Timeline.Timeline<Px.Px> = {
			size: Px.Px(100),
			view: { start: Px.Px(20), size: Px.Px(20) },
			min: Px.Px(10),
		};
		const scale = 2;

		const scroll = Scroll.toScroll(Px.Numeric, t.view.start, scale);
		const start = Scroll.fromScroll(Px.Numeric, scroll, scale);

		expect(start).toBe(t.view.start);
	});
});
