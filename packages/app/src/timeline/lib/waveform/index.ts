export { PeakCache } from "./cache";
export { drawWaveform } from "./render";
export { binPeaks, PEAKS_PER_SECOND, BIN_DURATION_SEC, PEAKS_PER_BIN } from "./bin";
export { PeakStore } from "./store";
export { decodeAudio } from "./decode";

import { PeakCache } from "./cache";

let instance: PeakCache | null = null;

export function getPeakCache(): PeakCache {
  if (!instance) {
    instance = new PeakCache();
    // Wipe IndexedDB from previous session
    instance.reset();
  }
  return instance;
}
