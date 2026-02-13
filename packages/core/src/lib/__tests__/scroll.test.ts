import { describe, expect, it } from "bun:test";
import * as Px from "../px";
import * as Span from "../span";
import * as Scroll from "../scroll";

describe("timeline/lib/scroll", () => {
  it("width returns full range width in screen px at given scale", () => {
    expect(Scroll.width(Px.Numeric, Px.Px(20), 3)).toBe(Px.Px(60));
  });

  it("toScroll converts view.start into scroll px offset from full.start", () => {
    const view = Span.make(Px.Numeric, 20, 40);
    const scale = 2;
    expect(Scroll.toScroll(Px.Numeric, view.start, scale)).toBe(Px.Px(40));
  });

  it("fromScroll is inverse of toScroll (same scale and timeline.full)", () => {
    const view = Span.make(Px.Numeric, 20, 40);
    const scale = 2;

    const scroll = Scroll.toScroll(Px.Numeric, view.start, scale);
    const start = Scroll.fromScroll(Px.Numeric, scroll, scale);

    expect(start).toBe(view.start);
  });
});
