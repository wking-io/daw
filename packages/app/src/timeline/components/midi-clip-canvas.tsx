import type { Handle } from "@remix-run/component";
import type { MidiNote } from "@daw/core/domain/midi";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import { shallowEqual } from "@daw/core/utils/shallow-equal";
import { prepareCanvas } from "../utils/prepare-canvas";
import { drawMidiNotes } from "../lib/midi-renderer";

export function MidiClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  let prev = {
    notes: null as readonly MidiNote[] | null,
    offset: NaN,
    isSelected: false,
    color: "",
    cssH: 0,
    width: NaN,
    scale: NaN,
    start: NaN,
    size: NaN,
  };

  return (props: {
    notes: readonly MidiNote[];
    isSelected: boolean;
    color?: string;
    projection: ClipProjection;
    offset: number;
  }) => {
    const dpr = window.devicePixelRatio || 1;
    const offset = props.offset;

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = props.projection.view.size;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      const next = {
        notes: props.notes,
        isSelected: props.isSelected,
        color: props.color ?? "",
        offset,
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

      const style = getComputedStyle(canvasEl);
      const colorVar = `--color-clip-fill${props.isSelected ? "-selected" : ""}`;
      const color = style.getPropertyValue(colorVar);

      drawMidiNotes(ctx, props.notes, cssH, color, props.projection, offset);
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
