import { describe, expect, it } from "bun:test";
import { peakMin, peakMax, peakCount } from "./bin";
import { reduceLevel, buildMipPyramid, selectMipLevel } from "./mip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a bin from flat [min, max, min, max, ...] values */
function makeBin(pairs: number[]): Int8Array {
  return new Int8Array(pairs);
}

// ---------------------------------------------------------------------------
// reduceLevel
// ---------------------------------------------------------------------------

describe("reduceLevel", () => {
  it("halves peak count (even)", () => {
    const bins = [makeBin([-10, 20, -30, 40])]; // 2 peaks
    const reduced = reduceLevel(bins);
    expect(peakCount(reduced[0]!)).toBe(1);
  });

  it("halves peak count (odd, rounds up)", () => {
    const bins = [makeBin([-10, 20, -30, 40, -5, 15])]; // 3 peaks
    const reduced = reduceLevel(bins);
    expect(peakCount(reduced[0]!)).toBe(2); // ceil(3/2) = 2
  });

  it("law: envelope preservation — reduced min <= all source mins", () => {
    const bin = makeBin([-10, 50, -30, 20]);
    const reduced = reduceLevel([bin]);
    // The reduced peak should have min = min(-10, -30) = -30
    expect(peakMin(reduced[0]!, 0)).toBe(-30);
    // and max = max(50, 20) = 50
    expect(peakMax(reduced[0]!, 0)).toBe(50);
  });

  it("law: envelope preservation for odd peak count", () => {
    const bin = makeBin([-10, 50, -30, 20, -5, 80]);
    const reduced = reduceLevel([bin]);
    // Peak 0 from [(-10,50), (-30,20)] → (-30, 50)
    expect(peakMin(reduced[0]!, 0)).toBe(-30);
    expect(peakMax(reduced[0]!, 0)).toBe(50);
    // Peak 1 from [(-5,80)] alone → (-5, 80)
    expect(peakMin(reduced[0]!, 1)).toBe(-5);
    expect(peakMax(reduced[0]!, 1)).toBe(80);
  });

  it("preserves bin count", () => {
    const bins = [makeBin([-1, 1, -2, 2]), makeBin([-3, 3, -4, 4])];
    const reduced = reduceLevel(bins);
    expect(reduced).toHaveLength(2);
  });

  it("handles single-peak bins (no reduction possible)", () => {
    const bins = [makeBin([-10, 20])];
    const reduced = reduceLevel(bins);
    expect(peakCount(reduced[0]!)).toBe(1);
    expect(peakMin(reduced[0]!, 0)).toBe(-10);
    expect(peakMax(reduced[0]!, 0)).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// buildMipPyramid
// ---------------------------------------------------------------------------

describe("buildMipPyramid", () => {
  it("level 0 is the input bins", () => {
    const bins = [makeBin([-10, 20, -30, 40])];
    const pyramid = buildMipPyramid(bins);
    expect(pyramid[0]).toBe(bins);
  });

  it("terminates when every bin has <= 1 peak", () => {
    // 4 peaks → 2 → 1 → stop. 3 levels.
    const bins = [makeBin([-1, 1, -2, 2, -3, 3, -4, 4])];
    const pyramid = buildMipPyramid(bins);
    const lastLevel = pyramid[pyramid.length - 1]!;
    for (const bin of lastLevel) {
      expect(peakCount(bin)).toBeLessThanOrEqual(1);
    }
  });

  it("each level has half the peaks of the previous", () => {
    const bins = [makeBin(new Array(16).fill(0))]; // 8 peaks
    const pyramid = buildMipPyramid(bins);
    for (let l = 1; l < pyramid.length; l++) {
      const prevCount = pyramid[l - 1]!.reduce((s, b) => s + peakCount(b), 0);
      const currCount = pyramid[l]!.reduce((s, b) => s + peakCount(b), 0);
      expect(currCount).toBe(Math.ceil(prevCount / 2));
    }
  });

  it("law: envelope never shrinks across levels", () => {
    const bins = [makeBin([-100, 50, -20, 80, -60, 30, -10, 90])];
    const pyramid = buildMipPyramid(bins);
    for (let l = 1; l < pyramid.length; l++) {
      for (let b = 0; b < pyramid[l]!.length; b++) {
        const currBin = pyramid[l]![b]!;
        for (let i = 0; i < peakCount(currBin); i++) {
          // The reduced min should be <= the min of its source peaks
          // and the reduced max should be >= the max of its source peaks
          const prevBin = pyramid[l - 1]![b]!;
          const srcStart = i * 2;
          for (let k = srcStart; k < Math.min(srcStart + 2, peakCount(prevBin)); k++) {
            expect(peakMin(currBin, i)).toBeLessThanOrEqual(peakMin(prevBin, k));
            expect(peakMax(currBin, i)).toBeGreaterThanOrEqual(peakMax(prevBin, k));
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// selectMipLevel
// ---------------------------------------------------------------------------

describe("selectMipLevel", () => {
  it("returns 0 at 1 peak/pixel or less", () => {
    expect(selectMipLevel(1, 10)).toBe(0);
    expect(selectMipLevel(0.5, 10)).toBe(0);
  });

  it("returns 0 when only 1 level available", () => {
    expect(selectMipLevel(100, 1)).toBe(0);
  });

  it("returns 1 at 2 peaks/pixel", () => {
    expect(selectMipLevel(2, 10)).toBe(1);
  });

  it("returns 2 at 4 peaks/pixel", () => {
    expect(selectMipLevel(4, 10)).toBe(2);
  });

  it("clamps to depth - 1", () => {
    expect(selectMipLevel(1024, 5)).toBe(4);
  });

  it("law: monotonicity — more peaks/pixel → higher or equal level", () => {
    const depth = 12;
    let prevLevel = 0;
    for (let ppp = 1; ppp <= 2048; ppp *= 2) {
      const level = selectMipLevel(ppp, depth);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});
