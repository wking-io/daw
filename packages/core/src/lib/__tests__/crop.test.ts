import { describe, expect, it } from "bun:test";
import * as Crop from "../crop";
import * as N from "../numeric";
import * as QN from "../qn";

describe("Crop", () => {
  it("scale is source / visible", () => {
    const c = Crop.make(32, 16, 0);
    expect(Crop.scale(c)).toBe(2);
  });

  it("ratio is offset / visible", () => {
    const c = Crop.make(32, 28, 4);
    expect(Crop.ratio(c)).toBeCloseTo(4 / 28);
  });

  it("isIdentity when source === visible and offset === 0", () => {
    expect(Crop.isIdentity(Crop.make(32, 32, 0))).toBe(true);
  });

  it("is not identity when offset !== 0", () => {
    expect(Crop.isIdentity(Crop.make(32, 32, 4))).toBe(false);
  });

  it("is not identity when source !== visible", () => {
    expect(Crop.isIdentity(Crop.make(32, 28, 0))).toBe(false);
  });

  it("move adjusts offset by delta", () => {
    const c = Crop.make(QN.QN(32), QN.QN(28), QN.QN(4));
    const shifted = Crop.move(c, QN.QN(-4));
    expect(shifted.offset).toBe(QN.QN(0));
  });

  // Laws

  it("law: identity crop has scale 1 and ratio 0", () => {
    for (const s of [1, 4, 16, 32, 128]) {
      const c = Crop.make(s, s, 0);
      expect(Crop.scale(c)).toBe(1);
      expect(Crop.ratio(c)).toBe(0);
      expect(Crop.isIdentity(c)).toBe(true);
    }
  });

  it("law: visible * scale === source", () => {
    const cases = [
      { source: 32, visible: 28, offset: 4 },
      { source: 16, visible: 8, offset: 2 },
      { source: 100, visible: 100, offset: 0 },
      { source: 64, visible: 32, offset: 16 },
    ];
    for (const { source, visible, offset } of cases) {
      const c = Crop.make(source, visible, offset);
      expect(visible * Crop.scale(c)).toBeCloseTo(source);
    }
  });

  it("law: move composes additively", () => {
    const c = Crop.make(QN.QN(32), QN.QN(28), QN.QN(4));
    const d1 = QN.QN(2);
    const d2 = QN.QN(3);
    const sequential = Crop.move(Crop.move(c, d1), d2);
    const combined = Crop.move(c, N.add(d1, d2));
    expect(sequential.offset).toBe(combined.offset);
  });

  it("law: move by zero is identity", () => {
    const c = Crop.make(QN.QN(32), QN.QN(28), QN.QN(4));
    const shifted = Crop.move(c, QN.zero);
    expect(shifted.offset).toBe(c.offset);
    expect(shifted.source).toBe(c.source);
    expect(shifted.visible).toBe(c.visible);
  });
});
