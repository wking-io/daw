import type { Handle } from "@remix-run/component";
import { prepareCanvas } from "../utils/prepare-canvas";
import { getPeakCache, drawWaveform } from "../lib/waveform";

export function AudioClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  const cache = getPeakCache();

  handle.on(cache, { load: () => handle.update() });

  return (props: {
    audioFileId: string;
    offsetSec: number;
    durationSec: number;
    isSelected: boolean;
  }) => {
    const dpr = window.devicePixelRatio || 1;
    const startSec = props.offsetSec;
    const endSec = startSec + props.durationSec;

    // Ensure peaks exist — generate synthetic if not yet loaded
    cache.prepareSynthetic(props.audioFileId, endSec);

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = canvasEl.parentElement?.clientWidth ?? 0;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      const bins = cache.getPeaks(props.audioFileId, startSec, endSec);
      if (bins) {
        const style = getComputedStyle(canvasEl);
        const color = style.getPropertyValue(
          `--color-clip-fill${props.isSelected ? "-selected" : ""}`,
        );
        drawWaveform(ctx, bins, cssW, cssH, color);
      }
    });

    return (
      <canvas
        connect={(node: HTMLCanvasElement) => {
          canvasEl = node;
        }}
        class="block size-full clip-vars"
      />
    );
  };
}
