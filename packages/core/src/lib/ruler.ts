// ruler.ts — Adaptive beat ruler for timeline
import type { QN } from "./qn";
import { QN as makeQN } from "./qn";
import type { TimeSignature } from "./time-signature";
import { EPSILON } from "./math";

/** Numeric tier: higher = more visually prominent */
export type TickTier = number;

export type RulerTick = Readonly<{
  position: QN;
  tier: TickTier;
  label: string | null;
}>;

export type RulerResult = Readonly<{
  ticks: readonly RulerTick[];
  finestTier: TickTier;
  barSizeQN: number;
  beatSizeQN: number;
}>;

export type RulerInput = Readonly<{
  viewStart: QN;
  viewSize: QN;
  scale: number; // px per QN
  timeSignature: TimeSignature;
  minSpacingPx?: number; // default 40 — minimum px between grid lines
  minLabelSpacingPx?: number; // default 80 — minimum px between labels
  maxSubdivisions?: number; // default 16 — finest subdivision per beat (16 = 64ths, 32 = 128ths, etc.)
}>;

const SIXTEENTH_QN = 0.25;
const DEFAULT_MIN_SPACING_PX = 20;
const DEFAULT_MIN_LABEL_SPACING_PX = 80;
const DEFAULT_MAX_SUBDIVISIONS = 128;
const MAX_MULTI_BAR = 4096;

export function barSizeQN(ts: TimeSignature): number {
  return ts.numerator * (4 / ts.denominator);
}

export function beatSizeQN(ts: TimeSignature): number {
  return 4 / ts.denominator;
}

/** Walk tier intervals finest→coarsest, return the first that meets spacing. */
function findFinestInterval(
  beat: number, bar: number, scale: number, minSpacing: number, maxSubdiv: number,
): number {
  // Sub-beat: beat/maxSubdiv, beat/(maxSubdiv/2), ..., beat/2
  for (let div = maxSubdiv; div >= 2; div /= 2) {
    if ((beat / div) * scale >= minSpacing) return beat / div;
  }
  if (beat * scale >= minSpacing) return beat;
  for (let m = bar; m <= bar * MAX_MULTI_BAR; m *= 2) {
    if (m * scale >= minSpacing) return m;
  }
  return bar * MAX_MULTI_BAR;
}

/** Format a QN position as bars[.beats[.sixteenths]] (all 1-indexed, trailing 1s omitted). */
function formatPosition(pos: number, beat: number, bar: number): string {
  const sixteenthsPerBeat = Math.round(beat / SIXTEENTH_QN);
  const sixteenthsPerBar = Math.round(bar / SIXTEENTH_QN);
  const total = Math.round(pos / SIXTEENTH_QN);

  const barIdx = Math.floor(total / sixteenthsPerBar);
  const rem = total - barIdx * sixteenthsPerBar;
  const beatIdx = Math.floor(rem / sixteenthsPerBeat);
  const sixteenthIdx = rem - beatIdx * sixteenthsPerBeat;

  const b = barIdx + 1;
  const bt = beatIdx + 1;
  const s = sixteenthIdx + 1;

  if (s !== 1) return `${b}.${bt}.${s}`;
  if (bt !== 1) return `${b}.${bt}`;
  return `${b}`;
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

export function computeRulerTicks(input: RulerInput): RulerResult {
  const { viewStart, viewSize, scale, timeSignature } = input;
  const minSpacing = input.minSpacingPx ?? DEFAULT_MIN_SPACING_PX;
  const minLabelSpacing = input.minLabelSpacingPx ?? DEFAULT_MIN_LABEL_SPACING_PX;
  const maxSubdiv = input.maxSubdivisions ?? DEFAULT_MAX_SUBDIVISIONS;
  const beat = beatSizeQN(timeSignature);
  const bar = barSizeQN(timeSignature);

  // Finest visible interval and its tier (for grid lines)
  const step = findFinestInterval(beat, bar, scale, minSpacing, maxSubdiv);
  const finestTier = intervalToTier(step, beat, bar);

  // Finest interval that qualifies for a label (wider spacing)
  const labelStep = findFinestInterval(beat, bar, scale, minLabelSpacing, maxSubdiv);
  const finestLabelTier = intervalToTier(labelStep, beat, bar);

  // Integer step ratios for tier lookup via divisibility
  const barStep = Math.round(bar / step);
  const beatStep = Math.round(beat / step);
  const barBase = finestTier >= 5 ? 1 : barStep;

  // Pre-compute sub-beat divisibility steps (beat/2, beat/4, ..., beat/maxSubdiv)
  const subBeatLevels = Math.round(Math.log2(maxSubdiv));
  const subBeatSteps: number[] = [];
  for (let k = 1; k <= subBeatLevels; k++) {
    subBeatSteps.push(Math.round(beat / (Math.pow(2, k) * step)));
  }

  // Half-bar label promotion: middle beat gets labels before all beats
  const beatsPerBar = Math.round(bar / beat);
  const halfBarBeatOffset = Math.floor(beatsPerBar / 2); // 0-indexed beat within bar
  const halfBarFitsLabels = (bar / 2) * scale >= minLabelSpacing;

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
          if (finestTier <= tierNum && idx % subBeatSteps[k]! === 0) {
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
    const isHalfBarBeat = halfBarFitsLabels && tier === 4 &&
      (idx % barStep) / beatStep === halfBarBeatOffset;
    const label = (tier >= finestLabelTier || isHalfBarBeat) && tier >= 2
      ? formatPosition(pos, beat, bar) : null;
    ticks.push({ position: makeQN(pos), tier, label });
  }

  return { ticks, finestTier, barSizeQN: bar, beatSizeQN: beat };
}
