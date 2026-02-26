import * as N from "@daw/core/lib/numeric";
import * as QN from "@daw/core/lib/qn";
import { computeGridInterval } from "@daw/core/lib/ruler";
import type { TimeSignature } from "@daw/core/lib/time-signature";

/** Snap a QN position to the nearest grid interval, clamped to zero. */
export function snapToGrid(position: QN.QN, scale: number, timeSignature: TimeSignature): QN.QN {
  const { interval } = computeGridInterval({ scale, timeSignature });
  const raw = N.divide(position, interval);
  const snapped = N.multiply(interval, Math.round(raw));
  return N.max(QN.zero, snapped);
}
