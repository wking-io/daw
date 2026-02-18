export const PEAKS_PER_SECOND = 800;
export const BIN_DURATION_SEC = 2;
export const PEAKS_PER_BIN = PEAKS_PER_SECOND * BIN_DURATION_SEC; // 1600

export function binPeaks(pcm: Float32Array, sampleRate: number): Uint8Array[] {
  const samplesPerPeak = sampleRate / PEAKS_PER_SECOND;
  const totalPeaks = Math.ceil(pcm.length / samplesPerPeak);
  const binCount = Math.ceil(totalPeaks / PEAKS_PER_BIN);

  const bins: Uint8Array[] = [];

  for (let b = 0; b < binCount; b++) {
    const peakStart = b * PEAKS_PER_BIN;
    const peakEnd = Math.min(peakStart + PEAKS_PER_BIN, totalPeaks);
    const bin = new Uint8Array(peakEnd - peakStart);

    for (let p = peakStart; p < peakEnd; p++) {
      const sampleStart = Math.floor(p * samplesPerPeak);
      const sampleEnd = Math.min(Math.floor((p + 1) * samplesPerPeak), pcm.length);

      let max = 0;
      for (let s = sampleStart; s < sampleEnd; s++) {
        const abs = Math.abs(pcm[s]!);
        if (abs > max) max = abs;
      }

      // Scale to 0-255
      bin[p - peakStart] = Math.min(255, Math.round(max * 255));
    }

    bins.push(bin);
  }

  return bins;
}

/**
 * Generate synthetic peak bins for demo/placeholder waveforms.
 * Uses a simple seeded PRNG so the same audioFileId always produces the same shape.
 */
export function synthesizeBins(audioFileId: string, durationSec: number): Uint8Array[] {
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

  const totalPeaks = Math.ceil(durationSec * PEAKS_PER_SECOND);
  const binCount = Math.ceil(totalPeaks / PEAKS_PER_BIN);
  const bins: Uint8Array[] = [];

  // Generate a smooth-ish envelope with some randomness
  let envelope = 0.5;
  for (let b = 0; b < binCount; b++) {
    const peakStart = b * PEAKS_PER_BIN;
    const peakEnd = Math.min(peakStart + PEAKS_PER_BIN, totalPeaks);
    const bin = new Uint8Array(peakEnd - peakStart);

    for (let p = 0; p < bin.length; p++) {
      // Slowly drift the envelope
      envelope += (rand() - 0.5) * 0.06;
      envelope = Math.max(0.15, Math.min(0.85, envelope));
      // Add per-sample jitter
      const jitter = (rand() - 0.5) * 0.3;
      const value = Math.max(0, Math.min(1, envelope + jitter));
      bin[p] = Math.round(value * 255);
    }

    bins.push(bin);
  }

  return bins;
}
