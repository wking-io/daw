import { describe, expect, it } from "bun:test";
import * as Projection from "../projection";
import * as Px from "../px";
import * as Span from "../span";

describe("timeline/lib/projection", () => {
  it("scaleFor maps view width to viewport width", () => {
    const view = Span.make(10, 10); // width 10
    const scale = Projection.scaleFor(view.size, Px.Px(100)); // => 10px/unit
    expect(scale).toBe(10);
  });

  it("toScreen/fromScreen are inverses (for same scale/from)", () => {
    const from = Px.Px(10);
    const scale = 2;
    const at = Px.Px(17);

    const px = Projection.to(from, at, scale);
    expect(px).toBe(Px.Px(14));

    const roundTrip = Projection.from(from, px, scale);
    expect(roundTrip).toBe(at);
  });
});
