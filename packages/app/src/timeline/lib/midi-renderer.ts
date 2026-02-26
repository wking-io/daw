import type { MidiNote } from "@daw/core/domain/midi";
import type { ClipProjection } from "@daw/core/lib/clip-projection";
import * as Projection from "@daw/core/lib/projection";

export function drawMidiNotes(
  ctx: CanvasRenderingContext2D,
  notes: readonly MidiNote[],
  clipSize: number,
  canvasH: number,
  color: string,
  projection: ClipProjection,
  offset = 0,
): void {
  if (notes.length === 0) return;

  let pitchMin = 127;
  let pitchMax = 0;
  for (const note of notes) {
    if (note.pitch < pitchMin) pitchMin = note.pitch;
    if (note.pitch > pitchMax) pitchMax = note.pitch;
  }

  const MIN_SLOTS = 18;
  // Add 1-note padding on each side
  pitchMin = Math.max(0, pitchMin - 1);
  pitchMax = Math.min(127, pitchMax + 1);

  // Expand range to at least MIN_SLOTS, centered on the existing range
  const rawRange = pitchMax - pitchMin + 1;
  if (rawRange < MIN_SLOTS) {
    const expand = MIN_SLOTS - rawRange;
    const expandBelow = Math.floor(expand / 2);
    const expandAbove = expand - expandBelow;
    pitchMin = Math.max(0, pitchMin - expandBelow);
    pitchMax = Math.min(127, pitchMax + expandAbove);
    // If we hit a boundary, shift the other side
    const finalRange = pitchMax - pitchMin + 1;
    if (finalRange < MIN_SLOTS) {
      if (pitchMin === 0) pitchMax = Math.min(127, pitchMin + MIN_SLOTS - 1);
      else pitchMin = Math.max(0, pitchMax - MIN_SLOTS + 1);
    }
  }

  const pitchRange = pitchMax - pitchMin + 1;

  ctx.fillStyle = color;

  const noteH = Math.max(1, canvasH / pitchRange);
  const scale = Projection.scaleFor(clipSize, projection.clipWidth);

  for (const note of notes) {
    const start = (note.span.start as number) - offset;
    const size = note.span.size as number;

    const clipX = start * scale;
    const w = Math.max(1, size * scale);

    // Skip notes entirely outside the visible window
    if (clipX + w < projection.visibleLeft || clipX > projection.visibleRight) continue;

    const x = clipX - projection.visibleLeft;
    const y = ((pitchMax - note.pitch) / pitchRange) * canvasH;

    ctx.fillRect(x, y, w, noteH);
  }
}
