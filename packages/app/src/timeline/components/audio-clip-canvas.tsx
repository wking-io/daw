import type { Handle } from "@remix-run/component";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import { shallowEqual } from "@daw/core/utils/shallow-equal";
import { prepareCanvas } from "../utils/prepare-canvas";
import { getPeakCache, drawWaveform, PEAKS_PER_SECOND } from "../lib/waveform";
import { selectMipLevel } from "../lib/waveform/mip";
import * as Sec from "@daw/core/lib/sec";
import * as N from "@daw/core/lib/numeric";

export function AudioClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  const cache = getPeakCache();
  let prev = {
    audioFileId: "",
    offset: NaN,
    duration: NaN,
    isSelected: false,
    color: "",
    cssH: 0,
    scale: NaN,
    width: NaN,
    start: NaN,
    size: NaN,
  };

  handle.on(cache, {
    load: () => {
      prev.audioFileId = "";
      handle.update();
    },
  });

  return (props: {
    audioFileId: string;
    offset: Sec.Sec;
    duration: Sec.Sec;
    isSelected: boolean;
    color?: string;
    projection: ClipProjection;
  }) => {
    const dpr = window.devicePixelRatio || 1;
    const start = props.offset;
    const end = N.add(props.offset, props.duration);

    // Ensure peaks exist — generate synthetic if not yet loaded
    cache.prepareSynthetic(props.audioFileId, end);

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = props.projection.view.size;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      const next = {
        audioFileId: props.audioFileId,
        offset: props.offset,
        duration: props.duration,
        isSelected: props.isSelected,
        color: props.color ?? "",
        cssH,
        scale: props.projection.scale,
        width: props.projection.width,
        ...props.projection.view,
      };

      if (shallowEqual(prev, next)) return;
      prev = next;

      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      // Clear inline height set by prepareCanvas so h-full class controls display size
      canvasEl.style.height = "";

      const depth = cache.getMipDepth(props.audioFileId);
      const baseTotalPeaks = Math.ceil(N.multiply(props.duration, PEAKS_PER_SECOND));
      const peaksPerPixel = baseTotalPeaks / props.projection.width;
      const level = selectMipLevel(peaksPerPixel, depth);

      const bins = cache.getPeaks(props.audioFileId, start, end, level);
      if (bins) {
        const style = getComputedStyle(canvasEl);
        const colorVar = `--color-clip-fill${props.isSelected ? "-selected" : ""}`;
        const color = style.getPropertyValue(colorVar);

        drawWaveform(ctx, bins, cssH, color, props.projection);
      }
    });

    return (
      <canvas
        connect={(node: HTMLCanvasElement) => {
          canvasEl = node;
        }}
        class="block h-full clip-vars"
        style={{ width: `${props.projection.view.size}px` }}
      />
    );
  };
}
