import type { Handle } from "@remix-run/component";
import type { MidiNote } from "@daw/core/domain/midi";
import { prepareCanvas } from "../utils/prepare-canvas";
import { drawMidiNotes } from "../lib/midi-renderer";

export function MidiClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  let prev = {
    notes: null as readonly MidiNote[] | null,
    clipSizeQN: NaN,
    isSelected: false,
    color: "",
    visibleLeft: NaN,
    visibleWidth: NaN,
    cssH: 0,
  };

  return (props: {
    notes: readonly MidiNote[];
    clipSizeQN: number;
    isSelected: boolean;
    color?: string;
    visibleLeft: number;
    visibleWidth: number;
    clipWidth: number;
  }) => {
    const dpr = window.devicePixelRatio || 1;

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = props.visibleWidth;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      // Skip redraw if nothing changed
      if (
        prev.notes === props.notes &&
        prev.clipSizeQN === props.clipSizeQN &&
        prev.isSelected === props.isSelected &&
        prev.color === (props.color ?? "") &&
        prev.visibleLeft === props.visibleLeft &&
        prev.visibleWidth === props.visibleWidth &&
        prev.cssH === cssH
      )
        return;
      prev = {
        notes: props.notes,
        clipSizeQN: props.clipSizeQN,
        isSelected: props.isSelected,
        color: props.color ?? "",
        visibleLeft: props.visibleLeft,
        visibleWidth: props.visibleWidth,
        cssH,
      };

      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      // Clear inline height set by prepareCanvas so h-full class controls display size
      canvasEl.style.height = "";

      const style = getComputedStyle(canvasEl);
      const colorVar = `--color-clip-fill${props.isSelected ? "-selected" : ""}`;
      const color = style.getPropertyValue(colorVar);

      drawMidiNotes(ctx, props.notes, props.clipSizeQN, props.clipWidth, cssH, color, props.visibleLeft, props.visibleWidth);
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
