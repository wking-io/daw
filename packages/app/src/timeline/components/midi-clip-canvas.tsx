import type { Handle } from "@remix-run/component";
import type { MidiNote } from "@daw/core/domain/midi";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import { prepareCanvas } from "../utils/prepare-canvas";
import { drawMidiNotes } from "../lib/midi-renderer";

export function MidiClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  let prev = {
    notes: null as readonly MidiNote[] | null,
    clipSize: NaN,
    isSelected: false,
    color: "",
    clipWidth: NaN,
    visibleLeft: NaN,
    visibleWidth: NaN,
    offset: NaN,
    cssH: 0,
  };

  return (props: {
    notes: readonly MidiNote[];
    clipSize: number;
    isSelected: boolean;
    color?: string;
    projection: ClipProjection;
    offset: number;
  }) => {
    const dpr = window.devicePixelRatio || 1;
    const offset = props.offset;

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = props.projection.visibleWidth;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      // Skip redraw if nothing changed
      if (
        prev.notes === props.notes &&
        prev.clipSize === props.clipSize &&
        prev.isSelected === props.isSelected &&
        prev.color === (props.color ?? "") &&
        prev.clipWidth === props.projection.clipWidth &&
        prev.visibleLeft === props.projection.visibleLeft &&
        prev.visibleWidth === props.projection.visibleWidth &&
        prev.offset === offset &&
        prev.cssH === cssH
      )
        return;
      prev = {
        notes: props.notes,
        clipSize: props.clipSize,
        isSelected: props.isSelected,
        color: props.color ?? "",
        clipWidth: props.projection.clipWidth,
        visibleLeft: props.projection.visibleLeft,
        visibleWidth: props.projection.visibleWidth,
        offset,
        cssH,
      };

      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      // Clear inline height set by prepareCanvas so h-full class controls display size
      canvasEl.style.height = "";

      const style = getComputedStyle(canvasEl);
      const colorVar = `--color-clip-fill${props.isSelected ? "-selected" : ""}`;
      const color = style.getPropertyValue(colorVar);

      drawMidiNotes(ctx, props.notes, props.clipSize, cssH, color, props.projection, offset);
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
