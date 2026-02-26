import type { ClipProjection } from "@daw/core/lib/clip-projection";
import * as Projection from "@daw/core/lib/projection";
import * as Span from "@daw/core/lib/span";
import type { PeakBin } from "./bin";
import { peakMin, peakMax, peakCount } from "./bin";

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  bins: PeakBin[],
  canvasH: number,
  color: string,
  projection: ClipProjection,
): void {
  if (bins.length === 0) return;

  let totalPeaks = 0;
  for (const bin of bins) totalPeaks += peakCount(bin);
  if (totalPeaks === 0) return;

  const centerY = canvasH / 2;
  ctx.fillStyle = color;

  const scale = Projection.scaleFor(totalPeaks, projection.width);

  if (totalPeaks <= projection.width) {
    // Fewer peaks than clip pixels: spread across clip width
    let peakIdx = 0;
    for (const bin of bins) {
      const count = peakCount(bin);
      for (let i = 0; i < count; i++) {
        const clipX = peakIdx * scale;
        const clipXEnd = clipX + Math.max(1, scale);
        peakIdx++;

        if (clipXEnd < projection.view.start || clipX > Span.end(projection.view)) continue;

        const min = peakMin(bin, i);
        const max = peakMax(bin, i);
        const yTop = centerY - (max / 127) * centerY;
        const yBot = centerY - (min / 127) * centerY;
        const x = clipX - projection.view.start;
        ctx.fillRect(x, yTop, Math.max(1, scale), yBot - yTop);
      }
    }
  } else {
    // More peaks than clip pixels: downsample (take min/max per pixel column)
    const peaksPerPixel = 1 / scale;
    const startPx = Math.max(0, Math.floor(projection.view.start));
    const endPx = Math.min(Math.ceil(projection.width), Math.ceil(Span.end(projection.view)));

    // Use first bin's peak count as stride for flat indexing
    const stride = bins.length > 0 ? peakCount(bins[0]!) : 0;

    for (let clipPx = startPx; clipPx < endPx; clipPx++) {
      const peakStart = Math.floor(clipPx * peaksPerPixel);
      const peakEnd = Math.floor((clipPx + 1) * peaksPerPixel);

      let colMin = 0;
      let colMax = 0;
      for (let p = peakStart; p < peakEnd; p++) {
        const binIdx = stride > 0 ? Math.floor(p / stride) : 0;
        const binOff = stride > 0 ? p % stride : p;
        const bin = bins[binIdx];
        if (bin && binOff < peakCount(bin)) {
          const pMin = peakMin(bin, binOff);
          const pMax = peakMax(bin, binOff);
          if (pMin < colMin) colMin = pMin;
          if (pMax > colMax) colMax = pMax;
        }
      }

      const yTop = centerY - (colMax / 127) * centerY;
      const yBot = centerY - (colMin / 127) * centerY;
      const x = clipPx - projection.view.start;
      ctx.fillRect(x, yTop, 1, yBot - yTop);
    }
  }
}
