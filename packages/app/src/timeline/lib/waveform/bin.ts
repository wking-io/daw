import * as Sec from "@daw/core/lib/sec";
import * as N from "@daw/core/lib/numeric";

export const PEAKS_PER_SECOND = Sec.Sec(800);
export const BIN_DURATION_SEC = Sec.Sec(2);
export const PEAKS_PER_BIN = N.multiply(PEAKS_PER_SECOND, BIN_DURATION_SEC); // 1600

/** Interleaved min/max pairs: [min0, max0, min1, max1, ...] */
export type PeakBin = Int8Array;

/** Reduction factor per mip level (each level halves the previous) */
export const MIP_REDUCTION = 2;

/** Read the min value at peak index i */
export function peakMin(bin: PeakBin, i: number): number {
  return bin[i * 2]!;
}

/** Read the max value at peak index i */
export function peakMax(bin: PeakBin, i: number): number {
  return bin[i * 2 + 1]!;
}

/** Number of peaks in a bin (half its byte length) */
export function peakCount(bin: PeakBin): number {
  return bin.length >>> 1;
}

export function binPeaks(pcm: Float32Array, sampleRate: number): PeakBin[] {
  const samplesPerPeak = sampleRate / PEAKS_PER_SECOND;
  const totalPeaks = Math.ceil(pcm.length / samplesPerPeak);
  const binCount = Math.ceil(totalPeaks / PEAKS_PER_BIN);

  const bins: PeakBin[] = [];

  for (let b = 0; b < binCount; b++) {
    const peakStart = b * PEAKS_PER_BIN;
    const peakEnd = Math.min(peakStart + PEAKS_PER_BIN, totalPeaks);
    const peakCnt = peakEnd - peakStart;
    const bin = new Int8Array(peakCnt * 2);

    for (let p = peakStart; p < peakEnd; p++) {
      const sampleStart = Math.floor(p * samplesPerPeak);
      const sampleEnd = Math.min(Math.floor((p + 1) * samplesPerPeak), pcm.length);

      let min = 0;
      let max = 0;
      for (let s = sampleStart; s < sampleEnd; s++) {
        const v = pcm[s]!;
        if (v < min) min = v;
        if (v > max) max = v;
      }

      const offset = (p - peakStart) * 2;
      bin[offset] = Math.max(-128, Math.round(min * 127));
      bin[offset + 1] = Math.min(127, Math.round(max * 127));
    }

    bins.push(bin);
  }

  return bins;
}

/**
 * Generate synthetic peak bins for demo/placeholder waveforms.
 * Uses a simple seeded PRNG so the same audioFileId always produces the same shape.
 */
export function synthesizeBins(audioFileId: string, duration: Sec.Sec): PeakBin[] {
  // Simple hash from string to seed
  let seed = 0;
  for (let i = 0; i < audioFileId.length; i++) {
    seed = (seed * 31 + audioFileId.charCodeAt(i)) | 0;
  }

  // xorshift32
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };

  const totalPeaks = N.ceil(N.multiply(duration, PEAKS_PER_SECOND));
  const binCount = Math.ceil(totalPeaks / PEAKS_PER_BIN);
  const bins: PeakBin[] = [];

  // Generate a smooth-ish envelope with some randomness
  let envelope = 0.5;
  for (let b = 0; b < binCount; b++) {
    const peakStart = b * PEAKS_PER_BIN;
    const peakEnd = Math.min(peakStart + PEAKS_PER_BIN, totalPeaks);
    const peakCnt = peakEnd - peakStart;
    const bin = new Int8Array(peakCnt * 2);

    for (let p = 0; p < peakCnt; p++) {
      // Slowly drift the envelope
      envelope += (rand() - 0.5) * 0.06;
      envelope = Math.max(0.15, Math.min(0.85, envelope));
      // Add per-sample jitter
      const jitter = (rand() - 0.5) * 0.3;
      const value = Math.max(0, Math.min(1, envelope + jitter));
      const scaled = Math.round(value * 127);
      bin[p * 2] = -scaled; // min (symmetric)
      bin[p * 2 + 1] = scaled; // max (symmetric)
    }

    bins.push(bin);
  }

  return bins;
}
