// ruler.ts — Adaptive beat ruler for timeline
import * as QN from "./qn";
import type { TimeSignature } from "./time-signature";
import { EPSILON } from "./math";

// =============================================================================
// Constants
// =============================================================================

const MIN_SPACING = 20;
const MIN_LABEL_SPACING = 70;
const MAX_SUBDIVISIONS = 256;

const SIXTEENTH = 0.25;
const MAX_MULTI_BAR = 4096;

// =============================================================================
// Tier constants (assumes 4/4 where beat = quarter note)
// =============================================================================

export const Tier = {
  NOTE_1024: -4,
  NOTE_512: -3,
  NOTE_256: -2,
  NOTE_128: -1,
  NOTE_64: 0,
  NOTE_32: 1,
  NOTE_16: 2,
  NOTE_8: 3,
  BEAT: 4,
  BAR: 5,
} as const;

// =============================================================================
// Types
// =============================================================================

/** Numeric tier: higher = more visually prominent */
export type TickTier = number;

export type RulerTick = Readonly<{
  position: QN.QN;
  tier: TickTier;
  label: string | null;
}>;

export type RulerResult = Readonly<{
  ticks: readonly RulerTick[];
  finestTier: TickTier;
  gridInterval: QN.QN;
  barSize: QN.QN;
  beatSize: QN.QN;
}>;

export type RulerInput = Readonly<{
  viewStart: QN.QN;
  viewSize: QN.QN;
  scale: number;
  timeSignature: TimeSignature;
}>;

// =============================================================================
// Helpers
// =============================================================================

export function computeBarSize(ts: TimeSignature): QN.QN {
  return QN.QN(ts.numerator * (4 / ts.denominator));
}

export function computeBeatSize(ts: TimeSignature): QN.QN {
  return QN.QN(4 / ts.denominator);
}

/** Walk tier intervals finest→coarsest, return the first that meets spacing. */
function findFinestInterval(
  beat: number,
  bar: number,
  scale: number,
  minSpacing: number,
  maxSubdiv: number,
  includeHalfBar = true,
): number {
  // Sub-beat: beat/maxSubdiv, beat/(maxSubdiv/2), ..., beat/2
  for (let div = maxSubdiv; div >= 2; div /= 2) {
    if ((beat / div) * scale >= minSpacing) return beat / div;
  }
  if (beat * scale >= minSpacing) return beat;
  // Half-bar: show middle beat tick as intermediate between beats and bars
  if (includeHalfBar) {
    const halfBar = bar / 2;
    if (halfBar > beat + EPSILON && halfBar * scale >= minSpacing) return halfBar;
  }
  for (let m = bar; m <= bar * MAX_MULTI_BAR; m *= 2) {
    if (m * scale >= minSpacing) return m;
  }
  return bar * MAX_MULTI_BAR;
}

/** Format a QN position as bars[.beats[.sixteenths]] (all 1-indexed, trailing 1s omitted). */
export function formatPosition(pos: number, beat: QN.QN, bar: QN.QN): string {
  const { b, bt, s } = positionParts(pos, beat, bar);

  if (s !== 1) return `${b}.${bt}.${s}`;
  if (bt !== 1) return `${b}.${bt}`;
  return `${b}`;
}

/** Format a QN position as bars.beats.sixteenths (all 1-indexed, always shows all parts). */
export function formatPositionFull(pos: number, beat: QN.QN, bar: QN.QN): string {
  const { b, bt, s } = positionParts(pos, beat, bar);
  return `${b}.${bt}.${s}`;
}

function positionParts(pos: number, beat: QN.QN, bar: QN.QN): { b: number; bt: number; s: number } {
  const sixteenthsPerBeat = Math.round(beat / SIXTEENTH);
  const sixteenthsPerBar = Math.round(bar / SIXTEENTH);
  const total = Math.round(pos / SIXTEENTH);

  const barIdx = Math.floor(total / sixteenthsPerBar);
  const rem = total - barIdx * sixteenthsPerBar;
  const beatIdx = Math.floor(rem / sixteenthsPerBeat);
  const sixteenthIdx = rem - beatIdx * sixteenthsPerBeat;

  return { b: barIdx + 1, bt: beatIdx + 1, s: sixteenthIdx + 1 };
}

/** Map an interval to its tier number. Beat = tier 4, sub-beats go down, bars go up. */
function intervalToTier(interval: number, beat: number, bar: number): number {
  if (interval > beat + EPSILON) {
    return 5 + Math.round(Math.log2(interval / bar)); // bars+
  }
  // Sub-beat: tier = 4 - log2(beat / interval)
  const ratio = beat / interval;
  const k = Math.round(Math.log2(ratio));
  return 4 - k;
}

// =============================================================================
// computeGridInterval — lightweight snap primitive
// =============================================================================

export function computeGridInterval(input: { scale: number; timeSignature: TimeSignature }): {
  interval: QN.QN;
  tier: TickTier;
} {
  const beat = computeBeatSize(input.timeSignature);
  const bar = computeBarSize(input.timeSignature);
  const step = findFinestInterval(beat, bar, input.scale, MIN_SPACING, MAX_SUBDIVISIONS);
  const tier = intervalToTier(step, beat, bar);
  return { interval: QN.QN(step), tier };
}

// =============================================================================
// computeRulerTicks
// =============================================================================

export function computeRulerTicks(input: RulerInput): RulerResult {
  const { viewStart, viewSize, scale, timeSignature } = input;
  const beat = computeBeatSize(timeSignature);
  const bar = computeBarSize(timeSignature);

  // Finest visible interval and its tier (for grid lines)
  const step = findFinestInterval(beat, bar, scale, MIN_SPACING, MAX_SUBDIVISIONS);
  const finestTier = intervalToTier(step, beat, bar);

  // Finest interval that qualifies for a label (wider spacing)
  // Half-bar label promotion is handled separately by isHalfBarBeat
  const labelStep = findFinestInterval(
    beat,
    bar,
    scale,
    MIN_LABEL_SPACING,
    MAX_SUBDIVISIONS,
    false,
  );
  const finestLabelTier = intervalToTier(labelStep, beat, bar);

  // Integer step ratios for tier lookup via divisibility
  const barStep = Math.round(bar / step);
  const beatStep = Math.round(beat / step);
  const barBase = finestTier >= 5 ? 1 : barStep;

  // Pre-compute sub-beat divisibility steps (beat/2, beat/4, ..., beat/maxSubdiv)
  const subBeatLevels = Math.round(Math.log2(MAX_SUBDIVISIONS));
  const subBeatSteps: number[] = [];
  for (let k = 1; k <= subBeatLevels; k++) {
    subBeatSteps.push(Math.round(beat / (Math.pow(2, k) * step)));
  }

  // Half-bar label promotion: middle beat gets labels before all beats
  const halfBarFitsLabels = (bar / 2) * scale >= MIN_LABEL_SPACING;

  // Viewport bounds snapped to finest grid
  const start = viewStart as number;
  const end = start + (viewSize as number);
  const first = Math.floor(start / step) * step;
  const last = Math.ceil(end / step) * step;

  const ticks: RulerTick[] = [];
  let idx = Math.round(first / step);

  for (let pos = first; pos <= last + EPSILON; pos += step, idx++) {
    // Tier via integer divisibility — coarsest match wins
    let tier: number;
    if (finestTier <= 4 && idx % barStep !== 0) {
      // Sub-bar: check from coarsest to finest
      if (idx % beatStep === 0) {
        tier = 4;
      } else {
        tier = finestTier;
        for (let k = 0; k < subBeatSteps.length; k++) {
          const tierNum = 3 - k; // 3=eighths, 2=sixteenths, 1=32nds, 0=64ths, -1=128ths, ...
          const subStep = subBeatSteps[k]!;
          if (finestTier <= tierNum && idx % subStep === 0) {
            tier = tierNum;
            break;
          }
        }
      }
    } else {
      // Bar-aligned (or bar+ zoom): walk multi-bar doublings
      tier = Math.max(finestTier, 5);
      for (let ms = barBase * 2; idx % ms === 0 && ms <= barBase * MAX_MULTI_BAR; ms *= 2) {
        tier++;
      }
    }

    // Labels: tiers at/above label threshold, plus half-bar beats when that spacing qualifies
    const isHalfBarBeat =
      halfBarFitsLabels && tier === 4 && barStep % 2 === 0 && idx % barStep === barStep / 2;
    const label =
      (tier >= finestLabelTier || isHalfBarBeat) && tier >= 2
        ? formatPosition(pos, beat, bar)
        : null;
    ticks.push({ position: QN.QN(pos), tier, label });
  }

  return { ticks, finestTier, gridInterval: QN.QN(step), barSize: bar, beatSize: beat };
}
