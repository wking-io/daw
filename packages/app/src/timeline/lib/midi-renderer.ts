import type { MidiNote } from "@daw/core/domain/midi";

export function drawMidiNotes(
  ctx: CanvasRenderingContext2D,
  notes: readonly MidiNote[],
  clipSizeQN: number,
  canvasW: number,
  canvasH: number,
  color: string,
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

  for (const note of notes) {
    const start = note.span.start as number;
    const size = note.span.size as number;

    const x = (start / clipSizeQN) * canvasW;
    const w = Math.max(1, (size / clipSizeQN) * canvasW);
    const y = ((pitchMax - note.pitch) / pitchRange) * canvasH;

    ctx.fillRect(x, y, w, noteH);
  }
}
