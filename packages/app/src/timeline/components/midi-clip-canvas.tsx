import type { Handle } from "@remix-run/component";
import type { MidiNote } from "@daw/core/domain/midi";
import { prepareCanvas } from "../utils/prepare-canvas";
import { drawMidiNotes } from "../lib/midi-renderer";

export function MidiClipCanvas(handle: Handle) {
  let canvasEl: HTMLCanvasElement;
  let prev = { notes: null as readonly MidiNote[] | null, clipSizeQN: NaN, isSelected: false, cssW: 0, cssH: 0 };

  return (props: { notes: readonly MidiNote[]; clipSizeQN: number; isSelected: boolean }) => {
    const dpr = window.devicePixelRatio || 1;

    handle.queueTask(() => {
      if (!canvasEl) return;

      const cssW = canvasEl.parentElement?.clientWidth ?? 0;
      const cssH = canvasEl.parentElement?.clientHeight ?? 0;
      if (cssW === 0 || cssH === 0) return;

      // Skip redraw if only CSS position changed (scroll)
      if (
        prev.notes === props.notes &&
        prev.clipSizeQN === props.clipSizeQN &&
        prev.isSelected === props.isSelected &&
        prev.cssW === cssW &&
        prev.cssH === cssH
      ) return;
      prev = { notes: props.notes, clipSizeQN: props.clipSizeQN, isSelected: props.isSelected, cssW, cssH };

      const ctx = prepareCanvas({ canvas: canvasEl, cssW, cssH, dpr });
      if (!ctx) return;

      const style = getComputedStyle(canvasEl);
      const color = style.getPropertyValue(
        `--color-clip-fill${props.isSelected ? "-selected" : ""}`,
      );
      drawMidiNotes(ctx, props.notes, props.clipSizeQN, cssW, cssH, color);
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
