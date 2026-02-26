import { describe, expect, it } from "bun:test";
import { shallowEqual } from "../shallow-equal";

describe("utils/shallow-equal", () => {
  it("returns true for identical values", () => {
    const obj = { a: 1, b: "x", c: true };
    expect(shallowEqual(obj, { ...obj })).toBe(true);
  });

  it("returns false when a value differs", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it("returns false when key count differs", () => {
    expect(
      shallowEqual({ a: 1 } as Record<string, unknown>, { a: 1, b: 2 } as Record<string, unknown>),
    ).toBe(false);
  });

  it("uses strict equality (NaN !== NaN)", () => {
    expect(shallowEqual({ v: NaN }, { v: NaN })).toBe(false);
  });

  it("distinguishes reference identity", () => {
    const arr = [1, 2];
    expect(shallowEqual({ v: arr }, { v: arr })).toBe(true);
    expect(shallowEqual({ v: arr }, { v: [1, 2] })).toBe(false);
  });

  it("returns true for two empty objects", () => {
    expect(shallowEqual({}, {})).toBe(true);
  });
});
