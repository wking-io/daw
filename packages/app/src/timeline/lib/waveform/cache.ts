import { decodeAudio } from "./decode";
import { binPeaks, synthesizeBins, BIN_DURATION_SEC } from "./bin";
import { PeakStore } from "./store";

export class PeakCache extends EventTarget {
  private store = new PeakStore();
  private memory = new Map<string, Uint8Array[]>();
  private pending = new Set<string>();

  /** Get peaks for a time range. Returns null if not yet loaded (triggers async load). */
  getPeaks(audioFileId: string, startSec: number, endSec: number): Uint8Array[] | null {
    const bins = this.memory.get(audioFileId);
    if (!bins) return null;

    const startBin = Math.floor(startSec / BIN_DURATION_SEC);
    const endBin = Math.min(Math.ceil(endSec / BIN_DURATION_SEC), bins.length);

    return bins.slice(startBin, endBin);
  }

  /** Request decode + bin for an audio file. Emits "load" when ready. */
  async prepare(audioFileId: string, source: string | ArrayBuffer): Promise<void> {
    if (this.memory.has(audioFileId) || this.pending.has(audioFileId)) return;
    this.pending.add(audioFileId);

    try {
      // Check IndexedDB first
      const inDb = await this.store.hasBins(audioFileId);
      if (inDb) {
        await this.loadFromStore(audioFileId);
      } else {
        const { pcm, sampleRate } = await decodeAudio(source);
        const bins = binPeaks(pcm, sampleRate);
        await this.store.putBins(audioFileId, bins);
        this.memory.set(audioFileId, bins);
      }

      this.dispatchEvent(new CustomEvent("load", { detail: audioFileId }));
    } finally {
      this.pending.delete(audioFileId);
    }
  }

  /** Generate synthetic peaks for an audio file (used when source is unavailable). */
  prepareSynthetic(audioFileId: string, durationSec: number): void {
    if (this.memory.has(audioFileId)) return;
    this.memory.set(audioFileId, synthesizeBins(audioFileId, durationSec));
  }

  /** Release cached bins for an audio file (call when clip is culled). */
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
    const bins: Uint8Array[] = [];
    let i = 0;
    while (true) {
      const bin = await this.store.getBin(audioFileId, i);
      if (!bin) break;
      bins.push(bin);
      i++;
    }
    this.memory.set(audioFileId, bins);
  }
}
