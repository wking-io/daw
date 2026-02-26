import type { PeakBin } from "./bin";
import { decodeAudio } from "./decode";
import { binPeaks, synthesizeBins, BIN_DURATION_SEC } from "./bin";
import { buildMipPyramid } from "./mip";
import { PeakStore } from "./store";
import * as Sec from "@daw/core/lib/sec";
import * as N from "@daw/core/lib/numeric";

type CachedPyramid = {
  levels: PeakBin[][];
  depth: number;
};

export class PeakCache extends EventTarget {
  private store = new PeakStore();
  private memory = new Map<string, CachedPyramid>();
  private pending = new Set<string>();

  /**
   * Get peaks for a time range at a specific mip level.
   * Returns null if not yet loaded. Level 0 = base resolution.
   */
  getPeaks(audioFileId: string, start: Sec.Sec, end: Sec.Sec, level: number = 0): PeakBin[] | null {
    const pyramid = this.memory.get(audioFileId);
    if (!pyramid) return null;

    const clampedLevel = Math.min(level, pyramid.depth - 1);
    const bins = pyramid.levels[clampedLevel];
    if (!bins) return null;

    const startBin = N.floor(N.divide(start, BIN_DURATION_SEC));
    const endBin = Math.min(N.ceil(N.divide(end, BIN_DURATION_SEC)), bins.length);

    return bins.slice(startBin, endBin);
  }

  /** Get the number of mip levels for an audio file, or 0 if not loaded. */
  getMipDepth(audioFileId: string): number {
    return this.memory.get(audioFileId)?.depth ?? 0;
  }

  /** Request decode + bin + pyramid for an audio file. Emits "load" when ready. */
  async prepare(audioFileId: string, source: string | ArrayBuffer): Promise<void> {
    if (this.memory.has(audioFileId) || this.pending.has(audioFileId)) return;
    this.pending.add(audioFileId);

    try {
      const inDb = await this.store.hasBins(audioFileId);
      if (inDb) {
        await this.loadFromStore(audioFileId);
      } else {
        const { pcm, sampleRate } = await decodeAudio(source);
        const baseBins = binPeaks(pcm, sampleRate);
        const levels = buildMipPyramid(baseBins);
        await this.store.putPyramid(audioFileId, levels);
        this.memory.set(audioFileId, { levels, depth: levels.length });
      }

      this.dispatchEvent(new CustomEvent("load", { detail: audioFileId }));
    } finally {
      this.pending.delete(audioFileId);
    }
  }

  /** Generate synthetic peaks for an audio file (used when source is unavailable). */
  prepareSynthetic(audioFileId: string, duration: Sec.Sec): void {
    const existing = this.memory.get(audioFileId);
    const neededBins = N.ceil(N.divide(duration, BIN_DURATION_SEC));
    if (existing && existing.levels[0]!.length >= neededBins) return;

    const baseBins = synthesizeBins(audioFileId, duration);
    const levels = buildMipPyramid(baseBins);
    this.memory.set(audioFileId, { levels, depth: levels.length });
  }

  /** Release cached pyramid for an audio file. */
  release(audioFileId: string): void {
    this.memory.delete(audioFileId);
  }

  /** Clear everything (session start). */
  async reset(): Promise<void> {
    this.memory.clear();
    this.pending.clear();
    await this.store.clear();
  }

  private async loadFromStore(audioFileId: string): Promise<void> {
    const meta = await this.store.getMeta(audioFileId);
    if (!meta) return;

    const levels: PeakBin[][] = [];
    for (let level = 0; level < meta.depth; level++) {
      const bins: PeakBin[] = [];
      for (let i = 0; i < meta.binCounts[level]!; i++) {
        const bin = await this.store.getBin(audioFileId, level, i);
        if (bin) bins.push(bin);
      }
      levels.push(bins);
    }

    this.memory.set(audioFileId, { levels, depth: meta.depth });
  }
}
