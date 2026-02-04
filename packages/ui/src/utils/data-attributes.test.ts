import { describe, expect, it } from "bun:test";
import { getDataAttributes } from "./data-attributes";

describe("getDataAttributes", () => {
  it("adds data- prefix for true states", () => {
    const attrs = getDataAttributes({ open: true, disabled: false });

    expect(attrs).toEqual({
      "data-open": "",
    });
  });

  it("preserves keys that already start with data-", () => {
    const attrs = getDataAttributes({ "data-state": true });

    expect(attrs).toEqual({
      "data-state": "",
    });
  });

  it("skips falsey values", () => {
    const attrs = getDataAttributes({ open: false, active: true });

    expect(attrs).toEqual({
      "data-active": "",
    });
  });
});
