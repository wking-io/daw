import { describe, expect, it } from "bun:test";
import * as Sec from "@daw/core/lib/sec";
import {
  binPeaks,
  synthesizeBins,
  peakMin,
  peakMax,
  peakCount,
  PEAKS_PER_SECOND,
  PEAKS_PER_BIN,
} from "./bin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePcm(samples: number[]): Float32Array {
  return new Float32Array(samples);
}

// ---------------------------------------------------------------------------
// Accessor helpers
// ---------------------------------------------------------------------------

describe("peakCount", () => {
  it("returns half the byte length", () => {
    expect(peakCount(new Int8Array(0))).toBe(0);
    expect(peakCount(new Int8Array(2))).toBe(1);
    expect(peakCount(new Int8Array(10))).toBe(5);
  });
});

describe("peakMin / peakMax", () => {
  it("reads interleaved min/max pairs", () => {
    const bin = new Int8Array([-50, 60, -10, 20]);
    expect(peakMin(bin, 0)).toBe(-50);
    expect(peakMax(bin, 0)).toBe(60);
    expect(peakMin(bin, 1)).toBe(-10);
    expect(peakMax(bin, 1)).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// binPeaks
// ---------------------------------------------------------------------------

describe("binPeaks", () => {
  it("returns empty array for empty PCM", () => {
    const bins = binPeaks(makePcm([]), 44100);
    expect(bins).toHaveLength(0);
  });

  it("law: min <= 0 and max >= 0 for all peaks", () => {
    const pcm = makePcm([0.5, -0.3, 0.8, -0.9, 0.1, -0.1]);
    const bins = binPeaks(pcm, 1);
    for (const bin of bins) {
      for (let i = 0; i < peakCount(bin); i++) {
        expect(peakMin(bin, i)).toBeLessThanOrEqual(0);
        expect(peakMax(bin, i)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("law: silence produces (0, 0) pairs", () => {
    const pcm = makePcm(new Array(1000).fill(0));
    const bins = binPeaks(pcm, 44100);
    for (const bin of bins) {
      for (let i = 0; i < peakCount(bin); i++) {
        expect(peakMin(bin, i)).toBe(0);
        expect(peakMax(bin, i)).toBe(0);
      }
    }
  });

  it("law: full positive scale clips to 127", () => {
    const pcm = makePcm([1.0]);
    const bins = binPeaks(pcm, PEAKS_PER_SECOND);
    expect(peakMax(bins[0]!, 0)).toBe(127);
  });

  it("law: full negative scale clips to -128", () => {
    const pcm = makePcm([-1.0]);
    const bins = binPeaks(pcm, PEAKS_PER_SECOND);
    expect(peakMin(bins[0]!, 0)).toBe(-127);
  });

  it("captures asymmetric waveform", () => {
    // Use low sample rate so multiple samples fall in one peak window
    // sampleRate=2, PEAKS_PER_SECOND=800 → samplesPerPeak = 2/800 < 1
    // So each sample is its own peak. Use a rate that groups them.
    // With sampleRate=1600 and 2 samples: samplesPerPeak = 1600/800 = 2
    // Both samples in one peak window.
    const pcm = makePcm([-0.8, 0.2]);
    const bins = binPeaks(pcm, 1600);
    const bin = bins[0]!;
    expect(peakMin(bin, 0)).toBeLessThan(0);
    expect(peakMax(bin, 0)).toBeGreaterThan(0);
    expect(Math.abs(peakMin(bin, 0))).toBeGreaterThan(peakMax(bin, 0));
  });

  it("produces correct number of peaks and bins", () => {
    // At sampleRate = PEAKS_PER_SECOND, each peak covers 1 sample
    const sampleCount = PEAKS_PER_BIN + 10; // just over 1 bin
    const pcm = makePcm(new Array(sampleCount).fill(0.5));
    const bins = binPeaks(pcm, PEAKS_PER_SECOND);
    expect(bins).toHaveLength(2);
    expect(peakCount(bins[0]!)).toBe(PEAKS_PER_BIN);
    expect(peakCount(bins[1]!)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// synthesizeBins
// ---------------------------------------------------------------------------

describe("synthesizeBins", () => {
  it("law: synthetic bins are symmetric (min = -max)", () => {
    const bins = synthesizeBins("test-file", Sec.Sec(1));
    for (const bin of bins) {
      for (let i = 0; i < peakCount(bin); i++) {
        expect(peakMin(bin, i)).toBe(-peakMax(bin, i));
      }
    }
  });

  it("law: deterministic — same inputs produce same output", () => {
    const a = synthesizeBins("determinism-test", Sec.Sec(2));
    const b = synthesizeBins("determinism-test", Sec.Sec(2));
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(Array.from(a[i]!)).toEqual(Array.from(b[i]!));
    }
  });

  it("different ids produce different output", () => {
    const a = synthesizeBins("file-a", Sec.Sec(1));
    const b = synthesizeBins("file-b", Sec.Sec(1));
    // Extremely unlikely to be identical
    const aFlat = a.flatMap((bin) => Array.from(bin));
    const bFlat = b.flatMap((bin) => Array.from(bin));
    expect(aFlat).not.toEqual(bFlat);
  });

  it("produces correct number of bins for duration", () => {
    const bins = synthesizeBins("test", Sec.Sec(5));
    // 5 sec * 800 peaks/sec = 4000 peaks / 1600 per bin = 3 bins (ceil)
    expect(bins).toHaveLength(3);
  });
});
