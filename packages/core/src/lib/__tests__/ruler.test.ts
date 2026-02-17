import { describe, expect, it } from "bun:test";
import { QN } from "../qn";
import * as TimeSignature from "../time-signature";
import { computeRulerTicks, computeGridInterval, barSize, beatSize, Tier } from "../ruler";
import type { RulerInput } from "../ruler";

function input(overrides: Partial<RulerInput> = {}): RulerInput {
  return {
    viewStart: QN(0),
    viewSize: QN(16),
    scale: 50,
    timeSignature: TimeSignature.common,
    ...overrides,
  };
}

describe("lib/ruler", () => {
  describe("barSize", () => {
    it("4/4 → 4", () => {
      expect(barSize(TimeSignature.common)).toBe(QN(4));
    });

    it("3/4 → 3", () => {
      expect(barSize(TimeSignature.waltz)).toBe(QN(3));
    });

    it("6/8 → 3", () => {
      expect(barSize(TimeSignature.compound)).toBe(QN(3));
    });

    it("2/2 → 4", () => {
      expect(barSize(TimeSignature.cut)).toBe(QN(4));
    });
  });

  describe("beatSize", () => {
    it("4/4 → 1", () => {
      expect(beatSize(TimeSignature.common)).toBe(QN(1));
    });

    it("3/4 → 1", () => {
      expect(beatSize(TimeSignature.waltz)).toBe(QN(1));
    });

    it("6/8 → 0.5", () => {
      expect(beatSize(TimeSignature.compound)).toBe(QN(0.5));
    });

    it("2/2 → 2", () => {
      expect(beatSize(TimeSignature.cut)).toBe(QN(2));
    });
  });

  // MIN_SPACING=20, MIN_LABEL_SPACING=70, MAX_SUBDIVISIONS=256
  // 4/4: beat=1, bar=4
  // Tier thresholds (scale where tier becomes visible):
  //   tier 4 (beat):     scale >= 20
  //   tier 3 (eighths):  scale >= 40
  //   tier 2 (16ths):    scale >= 80
  //   tier 1 (32nds):    scale >= 160
  //   tier 0 (64ths):    scale >= 320
  //   tier -1 (128ths):  scale >= 640
  describe("computeRulerTicks", () => {
    describe("4/4 at low zoom → only bar ticks", () => {
      it("shows only bar-level or higher ticks when zoomed out", () => {
        // scale=3: bar (4 QN) * 3 = 12px < 20 → multi-bar
        const result = computeRulerTicks(input({ scale: 3, viewSize: QN(64) }));
        expect(result.finestTier).toBeGreaterThanOrEqual(5);
        for (const tick of result.ticks) {
          expect(tick.tier).toBeGreaterThanOrEqual(5);
        }
      });
    });

    describe("4/4 at high zoom → beats and sub-beats visible", () => {
      it("shows beats at moderate zoom", () => {
        // scale=25: beat * 25 = 25px >= 20, beat/2 * 25 = 12.5 < 20 → tier 4
        const result = computeRulerTicks(input({ scale: 25 }));
        expect(result.finestTier).toBe(Tier.BEAT);
        expect(result.gridInterval).toBe(QN(1));
        const beatTicks = result.ticks.filter((t) => t.tier === Tier.BEAT);
        const barTicks = result.ticks.filter((t) => t.tier >= Tier.BAR);
        expect(beatTicks.length).toBeGreaterThan(0);
        expect(barTicks.length).toBeGreaterThan(0);
      });

      it("shows eighths at high zoom", () => {
        // scale=50: beat/2 (0.5) * 50 = 25px >= 20 → tier 3
        const result = computeRulerTicks(input({ scale: 50 }));
        expect(result.finestTier).toBe(Tier.NOTE_8);
        expect(result.gridInterval).toBe(QN(0.5));
        const eighthTicks = result.ticks.filter((t) => t.tier === Tier.NOTE_8);
        expect(eighthTicks.length).toBeGreaterThan(0);
      });

      it("shows sixteenths at very high zoom", () => {
        // scale=100: beat/4 (0.25) * 100 = 25px >= 20 → tier 2
        const result = computeRulerTicks(input({ scale: 100 }));
        expect(result.finestTier).toBe(Tier.NOTE_16);
        expect(result.gridInterval).toBe(QN(0.25));
        const sixteenthTicks = result.ticks.filter((t) => t.tier === Tier.NOTE_16);
        expect(sixteenthTicks.length).toBeGreaterThan(0);
      });

      it("shows 32nds at extreme zoom", () => {
        // scale=200: beat/8 (0.125) * 200 = 25px >= 20 → tier 1
        const result = computeRulerTicks(input({ scale: 200 }));
        expect(result.finestTier).toBe(Tier.NOTE_32);
        expect(result.gridInterval).toBe(QN(0.125));
        const thirtySecondTicks = result.ticks.filter((t) => t.tier === Tier.NOTE_32);
        expect(thirtySecondTicks.length).toBeGreaterThan(0);
      });

      it("shows 64ths at maximum zoom", () => {
        // scale=400: beat/16 (0.0625) * 400 = 25px >= 20 → tier 0
        const result = computeRulerTicks(input({ scale: 400 }));
        expect(result.finestTier).toBe(Tier.NOTE_64);
        expect(result.gridInterval).toBe(QN(0.0625));
        const sixtyFourthTicks = result.ticks.filter((t) => t.tier === Tier.NOTE_64);
        expect(sixtyFourthTicks.length).toBeGreaterThan(0);
      });

      it("shows 128ths at extreme zoom", () => {
        // scale=800: beat/32 (0.03125) * 800 = 25px >= 20 → tier -1
        const result = computeRulerTicks(input({ scale: 800, viewSize: QN(4) }));
        expect(result.finestTier).toBe(Tier.NOTE_128);
        expect(result.gridInterval).toBe(QN(0.03125));
        const tier128 = result.ticks.filter((t) => t.tier === Tier.NOTE_128);
        expect(tier128.length).toBeGreaterThan(0);
      });
    });

    describe("3/4 and 6/8 produce correct bar/beat sizes", () => {
      it("3/4 has barSize=3 and beatSize=1", () => {
        const result = computeRulerTicks(input({ timeSignature: TimeSignature.waltz, scale: 50 }));
        expect(result.barSize).toBe(QN(3));
        expect(result.beatSize).toBe(QN(1));
      });

      it("6/8 has barSize=3 and beatSize=0.5", () => {
        const result = computeRulerTicks(
          input({ timeSignature: TimeSignature.compound, scale: 100 }),
        );
        expect(result.barSize).toBe(QN(3));
        expect(result.beatSize).toBe(QN(0.5));
      });
    });

    describe("tier assignment", () => {
      it("position at bar boundary gets tier >= 5", () => {
        const result = computeRulerTicks(input({ scale: 25 }));
        const atBar = result.ticks.find((t) => (t.position as number) === 4);
        expect(atBar).toBeDefined();
        expect(atBar!.tier).toBeGreaterThanOrEqual(Tier.BAR);
      });

      it("position at beat but not bar gets tier 4", () => {
        const result = computeRulerTicks(input({ scale: 25 }));
        const atBeat = result.ticks.find((t) => (t.position as number) === 1);
        expect(atBeat).toBeDefined();
        expect(atBeat!.tier).toBe(Tier.BEAT);
      });

      it("position at eighth gets tier 3", () => {
        const result = computeRulerTicks(input({ scale: 50 }));
        const atEighth = result.ticks.find((t) => (t.position as number) === 0.5);
        expect(atEighth).toBeDefined();
        expect(atEighth!.tier).toBe(Tier.NOTE_8);
      });

      it("position at sixteenth gets tier 2", () => {
        const result = computeRulerTicks(input({ scale: 100 }));
        const atSixteenth = result.ticks.find((t) => (t.position as number) === 0.25);
        expect(atSixteenth).toBeDefined();
        expect(atSixteenth!.tier).toBe(Tier.NOTE_16);
      });

      it("position at 32nd gets tier 1", () => {
        const result = computeRulerTicks(input({ scale: 200 }));
        const at32nd = result.ticks.find((t) => (t.position as number) === 0.125);
        expect(at32nd).toBeDefined();
        expect(at32nd!.tier).toBe(Tier.NOTE_32);
      });

      it("position at 64th gets tier 0", () => {
        const result = computeRulerTicks(input({ scale: 400 }));
        const at64th = result.ticks.find((t) => (t.position as number) === 0.0625);
        expect(at64th).toBeDefined();
        expect(at64th!.tier).toBe(Tier.NOTE_64);
      });
    });

    describe("labels", () => {
      it("bar ticks omit trailing .1 components", () => {
        const result = computeRulerTicks(input({ scale: 25 }));
        const bar1 = result.ticks.find((t) => (t.position as number) === 0);
        const bar2 = result.ticks.find((t) => (t.position as number) === 4);
        expect(bar1?.label).toBe("1");
        expect(bar2?.label).toBe("2");
      });

      it("beat ticks omit trailing .1 sixteenths", () => {
        // scale=70: beat * 70 = 70px >= 70 (label spacing) → beats get labels
        const result = computeRulerTicks(input({ scale: 70 }));
        const beat2 = result.ticks.find((t) => (t.position as number) === 1);
        const beat3 = result.ticks.find((t) => (t.position as number) === 2);
        expect(beat2?.label).toBe("1.2");
        expect(beat3?.label).toBe("1.3");
      });

      it("sixteenth ticks show full bars.beats.sixteenths", () => {
        // scale=280: beat/4 * 280 = 70px >= 70 → sixteenths get labels
        const result = computeRulerTicks(input({ scale: 280 }));
        const sixteenth = result.ticks.find((t) => (t.position as number) === 0.25);
        expect(sixteenth).toBeDefined();
        expect(sixteenth!.label).toBe("1.1.2");
      });

      it("32nd and 64th ticks have null labels", () => {
        const result = computeRulerTicks(input({ scale: 400 }));
        const at32nd = result.ticks.find((t) => t.tier === Tier.NOTE_32);
        const at64th = result.ticks.find((t) => t.tier === Tier.NOTE_64);
        expect(at32nd).toBeDefined();
        expect(at32nd!.label).toBeNull();
        expect(at64th).toBeDefined();
        expect(at64th!.label).toBeNull();
      });

      it("labels are sparser than grid lines", () => {
        // scale=25: beat * 25 = 25px >= 20 (grid) but < 70 (label)
        // Grid has beat-level ticks, but only bars get labels
        const result = computeRulerTicks(input({ scale: 25 }));
        const beatTick = result.ticks.find(
          (t) => (t.position as number) === 1 && t.tier === Tier.BEAT,
        );
        expect(beatTick).toBeDefined();
        expect(beatTick!.label).toBeNull(); // below label spacing threshold

        const barTick = result.ticks.find(
          (t) => (t.position as number) === 4 && t.tier >= Tier.BAR,
        );
        expect(barTick).toBeDefined();
        expect(barTick!.label).toBe("2"); // above label spacing threshold
      });

      it("half-bar beat gets label before all beats", () => {
        // scale=35, 4/4: beat*35=35>=20 (grid), beat/2*35=17.5<20 → step=beat
        // bar/2*35=70>=70 → half-bar labeled
        const result = computeRulerTicks(input({ scale: 35 }));
        // Beat 3 (position 2) is the half-bar beat → gets label
        const halfBarBeat = result.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === Tier.BEAT,
        );
        expect(halfBarBeat).toBeDefined();
        expect(halfBarBeat!.label).toBe("1.3");
        // Beat 2 (position 1) is NOT half-bar → no label
        const beat2 = result.ticks.find(
          (t) => (t.position as number) === 1 && t.tier === Tier.BEAT,
        );
        expect(beat2).toBeDefined();
        expect(beat2!.label).toBeNull();
        // Beat 4 (position 3) is NOT half-bar → no label
        const beat4 = result.ticks.find(
          (t) => (t.position as number) === 3 && t.tier === Tier.BEAT,
        );
        expect(beat4).toBeDefined();
        expect(beat4!.label).toBeNull();
      });

      it("half-bar beat has no label when spacing too tight", () => {
        // scale=30: beat*30=30>=20 → step=beat, bar/2*30=60<70 → no half-bar labels
        const result = computeRulerTicks(input({ scale: 30 }));
        const halfBarBeat = result.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === Tier.BEAT,
        );
        expect(halfBarBeat).toBeDefined();
        expect(halfBarBeat!.label).toBeNull();
      });

      it("6/8 half-bar labels the 4th eighth note", () => {
        // 6/8: bar=3, beat=0.5, beatsPerBar=6, halfBarBeatOffset=3
        // scale=150: beat*150=75>=70 (label), bar/2*150=225>=70 → half-bar labeled
        // But we want only half-bar labeled, not all beats.
        // scale=50: beat*50=25>=20 (grid), beat/2*50=12.5<20 → step=beat
        //   beat*50=50<70 (no beat labels), bar/2*50=75>=70 → half-bar beat labeled
        const result = computeRulerTicks(
          input({ timeSignature: TimeSignature.compound, scale: 50, viewSize: QN(6) }),
        );
        // Beat 4 (position 1.5) is the half-bar beat
        const halfBarBeat = result.ticks.find(
          (t) => (t.position as number) === 1.5 && t.tier === Tier.BEAT,
        );
        expect(halfBarBeat).toBeDefined();
        expect(halfBarBeat!.label).toBe("1.4");
        // Beat 2 (position 0.5) is NOT half-bar → no label
        const beat2 = result.ticks.find(
          (t) => (t.position as number) === 0.5 && t.tier === Tier.BEAT,
        );
        expect(beat2).toBeDefined();
        expect(beat2!.label).toBeNull();
      });
    });

    describe("half-bar intermediate ticks", () => {
      it("4/4 shows half-bar ticks between beat and bar zoom levels", () => {
        // scale=12: beat*12=12<20, bar/2*12=24>=20 → step=bar/2, tier=4
        const result = computeRulerTicks(input({ scale: 12, viewSize: QN(32) }));
        expect(result.finestTier).toBe(Tier.BEAT);
        // Should have bar ticks (tier>=5) and half-bar ticks (tier 4), but no other beats
        const tier4 = result.ticks.filter((t) => t.tier === Tier.BEAT);
        const tierBar = result.ticks.filter((t) => t.tier >= Tier.BAR);
        expect(tier4.length).toBeGreaterThan(0);
        expect(tierBar.length).toBeGreaterThan(0);
        // Half-bar ticks should be at positions 2, 6, 10, ... (bar/2 offsets)
        for (const tick of tier4) {
          const pos = tick.position as number;
          expect(pos % 4).toBe(2); // at the midpoint of each bar
        }
      });

      it("half-bar tick gets label when label spacing allows", () => {
        // scale=12: bar/2*12=24<70 → no label on half-bar
        const noLabel = computeRulerTicks(input({ scale: 12, viewSize: QN(32) }));
        const halfBar = noLabel.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === Tier.BEAT,
        );
        expect(halfBar).toBeDefined();
        expect(halfBar!.label).toBeNull();

        // scale=35: beat*35=35>=20 → step=beat (not half-bar), but half-bar label promotion:
        // bar/2*35=70>=70 → half-bar beats get labels
        const withLabel = computeRulerTicks(input({ scale: 35, viewSize: QN(32) }));
        const halfBarLabeled = withLabel.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === Tier.BEAT,
        );
        expect(halfBarLabeled).toBeDefined();
        expect(halfBarLabeled!.label).toBe("1.3");
      });

      it("half-bar tick persists even when bar labels are removed", () => {
        // scale=12: bar/2*12=24>=20 → half-bar ticks visible
        // bar*12=48<70 → even bar labels may not appear
        // But the half-bar grid LINE should still show
        const result = computeRulerTicks(input({ scale: 12, viewSize: QN(32) }));
        const halfBarTick = result.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === Tier.BEAT,
        );
        expect(halfBarTick).toBeDefined();
        // Tick exists in the grid even though labels might not appear
      });

      it("no half-bar step in 2/4 (bar/2 === beat)", () => {
        // 2/4: beat=1, bar=2. bar/2=1=beat, so half-bar step is redundant
        const ts = { numerator: 2, denominator: 4 } as TimeSignature.TimeSignature;
        // scale=12: beat*12=12<20, bar/2=beat → skip, bar*12=24>=20 → step=bar
        const result = computeRulerTicks(input({ timeSignature: ts, scale: 12, viewSize: QN(32) }));
        expect(result.finestTier).toBeGreaterThanOrEqual(Tier.BAR);
      });

      it("6/8 shows half-bar ticks at bar midpoint", () => {
        // 6/8: beat=0.5, bar=3, bar/2=1.5
        // scale=15: beat*15=7.5<20, bar/2*15=22.5>=20 → step=bar/2
        const result = computeRulerTicks(
          input({ timeSignature: TimeSignature.compound, scale: 15, viewSize: QN(12) }),
        );
        expect(result.finestTier).toBe(Tier.BEAT);
        const tier4 = result.ticks.filter((t) => t.tier === Tier.BEAT);
        expect(tier4.length).toBeGreaterThan(0);
        // Half-bar ticks at positions 1.5, 4.5, ...
        for (const tick of tier4) {
          const pos = tick.position as number;
          expect(pos % 3).toBe(1.5);
        }
      });
    });

    describe("edge cases", () => {
      it("viewport starting mid-bar", () => {
        const result = computeRulerTicks(input({ viewStart: QN(2), scale: 50 }));
        const positions = result.ticks.map((t) => t.position as number);
        // Should snap start down to grid
        expect(positions[0]).toBeLessThanOrEqual(2);
        // Should cover the full viewport
        expect(positions[positions.length - 1]).toBeGreaterThanOrEqual(2 + 16);
      });

      it("negative positions", () => {
        const result = computeRulerTicks(input({ viewStart: QN(-8), viewSize: QN(16), scale: 50 }));
        // Bar at position -4 → bar 0
        const barAt4 = result.ticks.find(
          (t) => Math.abs((t.position as number) + 4) < 0.001 && t.tier >= Tier.BAR,
        );
        expect(barAt4).toBeDefined();
        expect(barAt4!.label).toBe("0");
        // Bar at position -8 → bar -1
        const barAt8 = result.ticks.find(
          (t) => Math.abs((t.position as number) + 8) < 0.001 && t.tier >= Tier.BAR,
        );
        expect(barAt8).toBeDefined();
        expect(barAt8!.label).toBe("-1");
      });

      it("6/8 beat labels count eighth notes", () => {
        // 6/8: beat=0.5, bar=3. At beat level, 6 beats per bar.
        // scale=150: beat * 150 = 75px >= 70 → beats get labels
        const result = computeRulerTicks(
          input({
            timeSignature: TimeSignature.compound,
            scale: 150,
            viewSize: QN(6),
          }),
        );
        const beat2 = result.ticks.find(
          (t) => (t.position as number) === 0.5 && t.tier === Tier.BEAT,
        );
        expect(beat2?.label).toBe("1.2");
        const beat6 = result.ticks.find(
          (t) => (t.position as number) === 2.5 && t.tier === Tier.BEAT,
        );
        expect(beat6?.label).toBe("1.6");
      });
    });

    describe("gridInterval", () => {
      it("returns the grid step size as QN", () => {
        // scale=25: step=beat=1
        const result = computeRulerTicks(input({ scale: 25 }));
        expect(result.gridInterval).toBe(QN(1));
      });

      it("reflects sub-beat intervals at higher zoom", () => {
        // scale=100: step=beat/4=0.25
        const result = computeRulerTicks(input({ scale: 100 }));
        expect(result.gridInterval).toBe(QN(0.25));
      });

      it("reflects multi-bar intervals at low zoom", () => {
        // scale=2: bar*2=8<20 wait... bar(4)*2=8<20, bar*4(=16)*2=32 wait
        // scale=2: bar*2=8, 2bar*2=16, 4bar*2=32>=20 → step=4bar=16
        const result = computeRulerTicks(input({ scale: 2, viewSize: QN(128) }));
        expect(result.gridInterval).toBe(QN(16));
      });
    });
  });

  describe("computeGridInterval", () => {
    it("returns beat interval at moderate zoom", () => {
      const { interval, tier } = computeGridInterval({
        scale: 25,
        timeSignature: TimeSignature.common,
      });
      expect(interval).toBe(QN(1));
      expect(tier).toBe(Tier.BEAT);
    });

    it("returns eighth interval at higher zoom", () => {
      const { interval, tier } = computeGridInterval({
        scale: 50,
        timeSignature: TimeSignature.common,
      });
      expect(interval).toBe(QN(0.5));
      expect(tier).toBe(Tier.NOTE_8);
    });

    it("returns sixteenth interval at high zoom", () => {
      const { interval, tier } = computeGridInterval({
        scale: 100,
        timeSignature: TimeSignature.common,
      });
      expect(interval).toBe(QN(0.25));
      expect(tier).toBe(Tier.NOTE_16);
    });

    it("returns bar interval at low zoom", () => {
      const { interval, tier } = computeGridInterval({
        scale: 5,
        timeSignature: TimeSignature.common,
      });
      expect(interval).toBe(QN(4));
      expect(tier).toBe(Tier.BAR);
    });

    it("works with 6/8 time signature", () => {
      // 6/8: beat=0.5, bar=3
      // scale=50: beat*50=25>=20 → step=beat=0.5
      const { interval, tier } = computeGridInterval({
        scale: 50,
        timeSignature: TimeSignature.compound,
      });
      expect(interval).toBe(QN(0.5));
      expect(tier).toBe(Tier.BEAT);
    });

    it("matches computeRulerTicks gridInterval", () => {
      for (const scale of [10, 25, 50, 100, 200, 400]) {
        const rulerResult = computeRulerTicks(input({ scale }));
        const gridResult = computeGridInterval({ scale, timeSignature: TimeSignature.common });
        expect(gridResult.interval).toBe(rulerResult.gridInterval);
      }
    });
  });
});
