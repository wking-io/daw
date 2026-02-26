import type { ClipProjection } from "@daw/core/lib/clip-projection";
import * as Projection from "@daw/core/lib/projection";
import { PEAKS_PER_BIN } from "./bin";

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  bins: Uint8Array[],
  canvasH: number,
  color: string,
  projection: ClipProjection,
): void {
  if (bins.length === 0) return;

  // Flatten bins into a single peaks view
  let totalPeaks = 0;
  for (const bin of bins) totalPeaks += bin.length;
  if (totalPeaks === 0) return;

  const centerY = canvasH / 2;
  ctx.fillStyle = color;

  const scale = Projection.scaleFor(totalPeaks, projection.clipWidth);

  if (totalPeaks <= projection.clipWidth) {
    // Fewer peaks than clip pixels: spread across clip width
    let peakIdx = 0;
    for (const bin of bins) {
      for (let i = 0; i < bin.length; i++) {
        const clipX = peakIdx * scale;
        const clipXEnd = clipX + Math.max(1, scale);
        peakIdx++;

        // Skip peaks entirely outside the visible window
        if (clipXEnd < projection.visibleLeft || clipX > projection.visibleRight) continue;

        const magnitude = (bin[i]! / 255) * centerY;
        const x = clipX - projection.visibleLeft;
        ctx.fillRect(x, centerY - magnitude, Math.max(1, scale), magnitude * 2);
      }
    }
  } else {
    // More peaks than clip pixels: downsample (take max per pixel column)
    // Only iterate over the visible pixel columns
    const peaksPerPixel = 1 / scale;
    const startPx = Math.max(0, Math.floor(projection.visibleLeft));
    const endPx = Math.min(Math.ceil(projection.clipWidth), Math.ceil(projection.visibleRight));

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
      const x = clipPx - projection.visibleLeft;
      ctx.fillRect(x, centerY - magnitude, 1, magnitude * 2);
    }
  }
}
