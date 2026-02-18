import { PEAKS_PER_BIN } from "./bin";

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  bins: Uint8Array[],
  canvasW: number,
  canvasH: number,
  color: string,
): void {
  if (bins.length === 0) return;

  // Flatten bins into a single peaks view
  let totalPeaks = 0;
  for (const bin of bins) totalPeaks += bin.length;
  if (totalPeaks === 0) return;

  const centerY = canvasH / 2;
  ctx.fillStyle = color;

  if (totalPeaks <= canvasW) {
    // Fewer peaks than pixels: spread
    const pxPerPeak = canvasW / totalPeaks;
    let peakIdx = 0;
    for (const bin of bins) {
      for (let i = 0; i < bin.length; i++) {
        const magnitude = (bin[i]! / 255) * centerY;
        const x = peakIdx * pxPerPeak;
        ctx.fillRect(x, centerY - magnitude, Math.max(1, pxPerPeak), magnitude * 2);
        peakIdx++;
      }
    }
  } else {
    // More peaks than pixels: downsample (take max per pixel column)
    const peaksPerPixel = totalPeaks / canvasW;
    for (let px = 0; px < canvasW; px++) {
      const peakStart = Math.floor(px * peaksPerPixel);
      const peakEnd = Math.floor((px + 1) * peaksPerPixel);

      let max = 0;
      for (let p = peakStart; p < peakEnd; p++) {
        const binIdx = Math.floor(p / PEAKS_PER_BIN);
        const binOff = p % PEAKS_PER_BIN;
        const bin = bins[binIdx];
        if (bin && binOff < bin.length) {
          const val = bin[binOff]!;
          if (val > max) max = val;
        }
      }

      const magnitude = (max / 255) * centerY;
      ctx.fillRect(px, centerY - magnitude, 1, magnitude * 2);
    }
  }
}
