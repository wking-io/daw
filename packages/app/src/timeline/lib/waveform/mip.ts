import type { PeakBin } from "./bin";
import { peakMin, peakMax, peakCount, MIP_REDUCTION } from "./bin";

/**
 * Reduce one level of bins to the next coarser level.
 * Takes pairs of consecutive peaks and produces one peak with:
 *   min = min(min_a, min_b)
 *   max = max(max_a, max_b)
 *
 * Preserves bin structure: same number of bins, half the peaks per bin.
 */
export function reduceLevel(bins: PeakBin[]): PeakBin[] {
  const result: PeakBin[] = [];

  for (const bin of bins) {
    const srcCount = peakCount(bin);
    const dstCount = Math.ceil(srcCount / MIP_REDUCTION);
    const dst = new Int8Array(dstCount * 2);

    for (let d = 0; d < dstCount; d++) {
      const s = d * MIP_REDUCTION;
      let min = peakMin(bin, s);
      let max = peakMax(bin, s);

      for (let k = 1; k < MIP_REDUCTION && s + k < srcCount; k++) {
        const pMin = peakMin(bin, s + k);
        const pMax = peakMax(bin, s + k);
        if (pMin < min) min = pMin;
        if (pMax > max) max = pMax;
      }

      dst[d * 2] = min;
      dst[d * 2 + 1] = max;
    }

    result.push(dst);
  }

  return result;
}

/**
 * Build the full mip pyramid from base-level bins.
 * Level 0 = base resolution (~800 peaks/sec).
 * Level N = 2^N reduction factor.
 * Stops when every bin has at most 1 peak.
 */
export function buildMipPyramid(baseBins: PeakBin[]): PeakBin[][] {
  const levels: PeakBin[][] = [baseBins];

  let current = baseBins;
  while (true) {
    let totalPeaks = 0;
    for (const bin of current) totalPeaks += peakCount(bin);
    if (totalPeaks <= current.length) break;

    const next = reduceLevel(current);
    levels.push(next);
    current = next;
  }

  return levels;
}

/**
 * Select the optimal mip level for the current zoom.
 *
 * Target: 1-4 peaks per pixel column at the selected level.
 * Each level reduces by MIP_REDUCTION (2x), so level L has
 * peaksPerPixel / 2^L effective peaks per pixel.
 *
 * @param peaksPerPixel - Base-level peaks per pixel column
 * @param depth - Number of available mip levels
 * @returns Mip level index (0 = finest, depth-1 = coarsest)
 */
export function selectMipLevel(peaksPerPixel: number, depth: number): number {
  if (peaksPerPixel <= 1 || depth <= 1) return 0;
  const level = Math.floor(Math.log2(peaksPerPixel));
  return Math.min(level, depth - 1);
}
