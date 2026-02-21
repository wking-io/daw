import { PEAKS_PER_BIN } from "./bin";

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  bins: Uint8Array[],
  clipWidth: number,
  canvasH: number,
  color: string,
  visibleLeft: number,
  visibleWidth: number,
): void {
  if (bins.length === 0) return;

  // Flatten bins into a single peaks view
  let totalPeaks = 0;
  for (const bin of bins) totalPeaks += bin.length;
  if (totalPeaks === 0) return;

  const centerY = canvasH / 2;
  ctx.fillStyle = color;

  if (totalPeaks <= clipWidth) {
    // Fewer peaks than clip pixels: spread across clip width
    const pxPerPeak = clipWidth / totalPeaks;
    let peakIdx = 0;
    const visibleRight = visibleLeft + visibleWidth;
    for (const bin of bins) {
      for (let i = 0; i < bin.length; i++) {
        const clipX = peakIdx * pxPerPeak;
        const clipXEnd = clipX + Math.max(1, pxPerPeak);
        peakIdx++;

        // Skip peaks entirely outside the visible window
        if (clipXEnd < visibleLeft || clipX > visibleRight) continue;

        const magnitude = (bin[i]! / 255) * centerY;
        const x = clipX - visibleLeft;
        ctx.fillRect(x, centerY - magnitude, Math.max(1, pxPerPeak), magnitude * 2);
      }
    }
  } else {
    // More peaks than clip pixels: downsample (take max per pixel column)
    // Only iterate over the visible pixel columns
    const peaksPerPixel = totalPeaks / clipWidth;
    const startPx = Math.max(0, Math.floor(visibleLeft));
    const endPx = Math.min(Math.ceil(clipWidth), Math.ceil(visibleLeft + visibleWidth));

    for (let clipPx = startPx; clipPx < endPx; clipPx++) {
      const peakStart = Math.floor(clipPx * peaksPerPixel);
      const peakEnd = Math.floor((clipPx + 1) * peaksPerPixel);

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
      const x = clipPx - visibleLeft;
      ctx.fillRect(x, centerY - magnitude, 1, magnitude * 2);
    }
  }
}
