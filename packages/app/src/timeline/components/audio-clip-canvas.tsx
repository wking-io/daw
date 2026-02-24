import type { Handle } from "@remix-run/component";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import { prepareCanvas } from "../utils/prepare-canvas";
import { getPeakCache, drawWaveform } from "../lib/waveform";
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
    clipWidth: NaN,
    visibleLeft: NaN,
    visibleWidth: NaN,
    cssH: 0,
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

      const cssW = props.projection.visibleWidth;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      // Skip redraw if nothing changed
      if (
        prev.audioFileId === props.audioFileId &&
        prev.offset === props.offset &&
        prev.duration === props.duration &&
        prev.isSelected === props.isSelected &&
        prev.color === (props.color ?? "") &&
        prev.clipWidth === props.projection.clipWidth &&
        prev.visibleLeft === props.projection.visibleLeft &&
        prev.visibleWidth === props.projection.visibleWidth &&
        prev.cssH === cssH
      )
        return;
      prev = {
        audioFileId: props.audioFileId,
        offset: props.offset,
        duration: props.duration,
        isSelected: props.isSelected,
        color: props.color ?? "",
        clipWidth: props.projection.clipWidth,
        visibleLeft: props.projection.visibleLeft,
        visibleWidth: props.projection.visibleWidth,
        cssH,
      };

      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      // Clear inline height set by prepareCanvas so h-full class controls display size
      canvasEl.style.height = "";

      const bins = cache.getPeaks(props.audioFileId, start, end);
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
        style={{ width: `${props.projection.visibleWidth}px` }}
      />
    );
  };
}
