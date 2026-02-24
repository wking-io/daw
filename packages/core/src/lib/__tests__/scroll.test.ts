import { describe, expect, it } from "bun:test";
import * as Span from "../span";
import * as Scroll from "../scroll";

describe("timeline/lib/scroll", () => {
  it("width returns full range width in screen px at given scale", () => {
    expect(Scroll.width(20, 3)).toBe(60);
  });

  it("toScroll converts view.start into scroll px offset from full.start", () => {
    const view = Span.make(20, 40);
    const scale = 2;
    expect(Scroll.toScroll(view.start, scale)).toBe(40);
  });

  it("fromScroll is inverse of toScroll (same scale and timeline.full)", () => {
    const view = Span.make(20, 40);
    const scale = 2;

    const scroll = Scroll.toScroll(view.start, scale);
    const start = Scroll.fromScroll(scroll, scale);

    expect(start).toBe(view.start);
  });
});
