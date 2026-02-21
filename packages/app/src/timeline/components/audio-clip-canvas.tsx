import type { Handle } from "@remix-run/component";
import { prepareCanvas } from "../utils/prepare-canvas";
import { getPeakCache, drawWaveform } from "../lib/waveform";

export function AudioClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  const cache = getPeakCache();
  let prev = {
    audioFileId: "",
    offsetSec: NaN,
    durationSec: NaN,
    isSelected: false,
    color: "",
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
    offsetSec: number;
    durationSec: number;
    isSelected: boolean;
    color?: string;
    visibleLeft: number;
    visibleWidth: number;
    clipWidth: number;
  }) => {
    const dpr = window.devicePixelRatio || 1;
    const startSec = props.offsetSec;
    const endSec = startSec + props.durationSec;

    // Ensure peaks exist — generate synthetic if not yet loaded
    cache.prepareSynthetic(props.audioFileId, endSec);

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = props.visibleWidth;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      // Skip redraw if nothing changed
      if (
        prev.audioFileId === props.audioFileId &&
        prev.offsetSec === props.offsetSec &&
        prev.durationSec === props.durationSec &&
        prev.isSelected === props.isSelected &&
        prev.color === (props.color ?? "") &&
        prev.visibleLeft === props.visibleLeft &&
        prev.visibleWidth === props.visibleWidth &&
        prev.cssH === cssH
      )
        return;
      prev = {
        audioFileId: props.audioFileId,
        offsetSec: props.offsetSec,
        durationSec: props.durationSec,
        isSelected: props.isSelected,
        color: props.color ?? "",
        visibleLeft: props.visibleLeft,
        visibleWidth: props.visibleWidth,
        cssH,
      };

      const resized = canvasEl.width !== Math.round(cssW * dpr) || canvasEl.height !== Math.round(cssH * dpr);
      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      // Clear inline height set by prepareCanvas so h-full class controls display size
      canvasEl.style.height = "";

      const bins = cache.getPeaks(props.audioFileId, startSec, endSec);
      if (bins) {
        const style = getComputedStyle(canvasEl);
        const colorVar = `--color-clip-fill${props.isSelected ? "-selected" : ""}`;
        const color = style.getPropertyValue(colorVar);

        console.debug("[audio-canvas] " + JSON.stringify({
          canvas: { cssW, cssH, backingW: canvasEl.width, backingH: canvasEl.height, resized },
          clipWidth: props.clipWidth,
          visibleLeft: props.visibleLeft,
          visibleWidth: props.visibleWidth,
          colorVar,
          color: color.trim(),
          parentW: canvasEl.parentElement?.clientWidth ?? null,
          peakBins: bins.length,
        }));

        drawWaveform(ctx, bins, props.clipWidth, cssH, color, props.visibleLeft, props.visibleWidth);
      }
    });

    return (
      <canvas
        connect={(node: HTMLCanvasElement) => {
          canvasEl = node;
        }}
        class="block h-full clip-vars"
        style={{ width: `${props.visibleWidth}px` }}
      />
    );
  };
}
