import { describe, expect, it } from "bun:test";
import { QN } from "../qn";
import * as TimeSignature from "../time-signature";
import { computeRulerTicks, barSizeQN, beatSizeQN } from "../ruler";
import type { RulerInput } from "../ruler";

function input(overrides: Partial<RulerInput> = {}): RulerInput {
  return {
    viewStart: QN(0),
    viewSize: QN(16),
    scale: 50,
    timeSignature: TimeSignature.common,
    minSpacingPx: 40,
    minLabelSpacingPx: 80,
    maxSubdivisions: 16,
    ...overrides,
  };
}

describe("lib/ruler", () => {
  describe("barSizeQN", () => {
    it("4/4 → 4", () => {
      expect(barSizeQN(TimeSignature.common)).toBe(4);
    });

    it("3/4 → 3", () => {
      expect(barSizeQN(TimeSignature.waltz)).toBe(3);
    });

    it("6/8 → 3", () => {
      expect(barSizeQN(TimeSignature.compound)).toBe(3);
    });

    it("2/2 → 4", () => {
      expect(barSizeQN(TimeSignature.cut)).toBe(4);
    });
  });

  describe("beatSizeQN", () => {
    it("4/4 → 1", () => {
      expect(beatSizeQN(TimeSignature.common)).toBe(1);
    });

    it("3/4 → 1", () => {
      expect(beatSizeQN(TimeSignature.waltz)).toBe(1);
    });

    it("6/8 → 0.5", () => {
      expect(beatSizeQN(TimeSignature.compound)).toBe(0.5);
    });

    it("2/2 → 2", () => {
      expect(beatSizeQN(TimeSignature.cut)).toBe(2);
    });
  });

  // Tier scheme: 0=64ths, 1=32nds, 2=16ths, 3=8ths, 4=beats, 5+=bars
  describe("computeRulerTicks", () => {
    describe("4/4 at low zoom → only bar ticks", () => {
      it("shows only bar-level or higher ticks when zoomed out", () => {
        // scale=5: bar (4 QN) * 5 = 20px < 40, multi-bar 8*5=40 → tier 6
        const result = computeRulerTicks(input({ scale: 5, viewSize: QN(64) }));
        expect(result.finestTier).toBeGreaterThanOrEqual(5);
        for (const tick of result.ticks) {
          expect(tick.tier).toBeGreaterThanOrEqual(5);
        }
      });
    });

    describe("4/4 at high zoom → beats and sub-beats visible", () => {
      it("shows beats at moderate zoom", () => {
        // scale=50: beat (1 QN) * 50 = 50px >= 40 → beat/2 not enough (25<40)
        // Finest = beat → tier 4
        const result = computeRulerTicks(input({ scale: 50 }));
        expect(result.finestTier).toBe(4);
        const beatTicks = result.ticks.filter((t) => t.tier === 4);
        const barTicks = result.ticks.filter((t) => t.tier >= 5);
        expect(beatTicks.length).toBeGreaterThan(0);
        expect(barTicks.length).toBeGreaterThan(0);
      });

      it("shows eighths at high zoom", () => {
        // scale=100: beat/2 (0.5) * 100 = 50px >= 40 → tier 3
        const result = computeRulerTicks(input({ scale: 100 }));
        expect(result.finestTier).toBe(3);
        const eighthTicks = result.ticks.filter((t) => t.tier === 3);
        expect(eighthTicks.length).toBeGreaterThan(0);
      });

      it("shows sixteenths at very high zoom", () => {
        // scale=200: beat/4 (0.25) * 200 = 50px >= 40 → tier 2
        const result = computeRulerTicks(input({ scale: 200 }));
        expect(result.finestTier).toBe(2);
        const sixteenthTicks = result.ticks.filter((t) => t.tier === 2);
        expect(sixteenthTicks.length).toBeGreaterThan(0);
      });

      it("shows 32nds at extreme zoom", () => {
        // scale=400: beat/8 (0.125) * 400 = 50px >= 40 → tier 1
        const result = computeRulerTicks(input({ scale: 400 }));
        expect(result.finestTier).toBe(1);
        const thirtySecondTicks = result.ticks.filter((t) => t.tier === 1);
        expect(thirtySecondTicks.length).toBeGreaterThan(0);
      });

      it("shows 64ths at maximum zoom", () => {
        // scale=800: beat/16 (0.0625) * 800 = 50px >= 40 → tier 0
        const result = computeRulerTicks(input({ scale: 800 }));
        expect(result.finestTier).toBe(0);
        const sixtyFourthTicks = result.ticks.filter((t) => t.tier === 0);
        expect(sixtyFourthTicks.length).toBeGreaterThan(0);
      });
    });

    describe("3/4 and 6/8 produce correct bar/beat sizes", () => {
      it("3/4 has barSizeQN=3 and beatSizeQN=1", () => {
        const result = computeRulerTicks(input({ timeSignature: TimeSignature.waltz, scale: 50 }));
        expect(result.barSizeQN).toBe(3);
        expect(result.beatSizeQN).toBe(1);
      });

      it("6/8 has barSizeQN=3 and beatSizeQN=0.5", () => {
        const result = computeRulerTicks(
          input({ timeSignature: TimeSignature.compound, scale: 100 }),
        );
        expect(result.barSizeQN).toBe(3);
        expect(result.beatSizeQN).toBe(0.5);
      });
    });

    describe("tier assignment", () => {
      it("position at bar boundary gets tier >= 5", () => {
        const result = computeRulerTicks(input({ scale: 50 }));
        const atBar = result.ticks.find((t) => (t.position as number) === 4);
        expect(atBar).toBeDefined();
        expect(atBar!.tier).toBeGreaterThanOrEqual(5);
      });

      it("position at beat but not bar gets tier 4", () => {
        const result = computeRulerTicks(input({ scale: 50 }));
        const atBeat = result.ticks.find((t) => (t.position as number) === 1);
        expect(atBeat).toBeDefined();
        expect(atBeat!.tier).toBe(4);
      });

      it("position at eighth gets tier 3", () => {
        const result = computeRulerTicks(input({ scale: 100 }));
        const atEighth = result.ticks.find((t) => (t.position as number) === 0.5);
        expect(atEighth).toBeDefined();
        expect(atEighth!.tier).toBe(3);
      });

      it("position at sixteenth gets tier 2", () => {
        const result = computeRulerTicks(input({ scale: 200 }));
        const atSixteenth = result.ticks.find((t) => (t.position as number) === 0.25);
        expect(atSixteenth).toBeDefined();
        expect(atSixteenth!.tier).toBe(2);
      });

      it("position at 32nd gets tier 1", () => {
        const result = computeRulerTicks(input({ scale: 400 }));
        const at32nd = result.ticks.find((t) => (t.position as number) === 0.125);
        expect(at32nd).toBeDefined();
        expect(at32nd!.tier).toBe(1);
      });

      it("position at 64th gets tier 0", () => {
        const result = computeRulerTicks(input({ scale: 800 }));
        const at64th = result.ticks.find((t) => (t.position as number) === 0.0625);
        expect(at64th).toBeDefined();
        expect(at64th!.tier).toBe(0);
      });
    });

    describe("labels", () => {
      it("bar ticks omit trailing .1 components", () => {
        const result = computeRulerTicks(input({ scale: 50 }));
        const bar1 = result.ticks.find((t) => (t.position as number) === 0);
        const bar2 = result.ticks.find((t) => (t.position as number) === 4);
        expect(bar1?.label).toBe("1");
        expect(bar2?.label).toBe("2");
      });

      it("beat ticks omit trailing .1 sixteenths", () => {
        // scale=100: beat * 100 = 100px >= 80 (label spacing) → beats get labels
        const result = computeRulerTicks(input({ scale: 100 }));
        const beat2 = result.ticks.find((t) => (t.position as number) === 1);
        const beat3 = result.ticks.find((t) => (t.position as number) === 2);
        expect(beat2?.label).toBe("1.2");
        expect(beat3?.label).toBe("1.3");
      });

      it("sixteenth ticks show full bars.beats.sixteenths", () => {
        // scale=400: beat/4 * 400 = 100px >= 80 → sixteenths get labels
        const result = computeRulerTicks(input({ scale: 400 }));
        const sixteenth = result.ticks.find((t) => (t.position as number) === 0.25);
        expect(sixteenth).toBeDefined();
        expect(sixteenth!.label).toBe("1.1.2");
      });

      it("32nd and 64th ticks have null labels", () => {
        const result = computeRulerTicks(input({ scale: 800 }));
        const at32nd = result.ticks.find((t) => t.tier === 1);
        const at64th = result.ticks.find((t) => t.tier === 0);
        expect(at32nd).toBeDefined();
        expect(at32nd!.label).toBeNull();
        expect(at64th).toBeDefined();
        expect(at64th!.label).toBeNull();
      });

      it("labels are sparser than grid lines", () => {
        // scale=50: beat * 50 = 50px >= 40 (grid) but < 80 (label)
        // Grid has beat-level ticks, but only bars get labels
        const result = computeRulerTicks(input({ scale: 50 }));
        const beatTick = result.ticks.find(
          (t) => (t.position as number) === 1 && t.tier === 4,
        );
        expect(beatTick).toBeDefined();
        expect(beatTick!.label).toBeNull(); // below label spacing threshold

        const barTick = result.ticks.find(
          (t) => (t.position as number) === 4 && t.tier >= 5,
        );
        expect(barTick).toBeDefined();
        expect(barTick!.label).toBe("2"); // above label spacing threshold
      });

      it("half-bar beat gets label before all beats", () => {
        // scale=50, 4/4: beat*50=50<80 (no beat labels), bar/2*50=100>=80 → half-bar labeled
        const result = computeRulerTicks(input({ scale: 50 }));
        // Beat 3 (position 2) is the half-bar beat → gets label
        const halfBarBeat = result.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === 4,
        );
        expect(halfBarBeat).toBeDefined();
        expect(halfBarBeat!.label).toBe("1.3");
        // Beat 2 (position 1) is NOT half-bar → no label
        const beat2 = result.ticks.find(
          (t) => (t.position as number) === 1 && t.tier === 4,
        );
        expect(beat2).toBeDefined();
        expect(beat2!.label).toBeNull();
        // Beat 4 (position 3) is NOT half-bar → no label
        const beat4 = result.ticks.find(
          (t) => (t.position as number) === 3 && t.tier === 4,
        );
        expect(beat4).toBeDefined();
        expect(beat4!.label).toBeNull();
      });

      it("half-bar beat has no label when spacing too tight", () => {
        // minLabelSpacingPx=120: bar/2*50=100<120 → no half-bar labels
        const result = computeRulerTicks(input({ scale: 50, minLabelSpacingPx: 120 }));
        const halfBarBeat = result.ticks.find(
          (t) => (t.position as number) === 2 && t.tier === 4,
        );
        expect(halfBarBeat).toBeDefined();
        expect(halfBarBeat!.label).toBeNull();
      });

      it("6/8 half-bar labels the 4th eighth note", () => {
        // 6/8: bar=3, beat=0.5, beatsPerBar=6, halfBarBeatOffset=3
        // scale=100: beat*100=50<80, bar/2*100=150>=80 → half-bar labeled
        const result = computeRulerTicks(
          input({ timeSignature: TimeSignature.compound, scale: 100, viewSize: QN(6) }),
        );
        // Beat 4 (position 1.5) is the half-bar beat
        const halfBarBeat = result.ticks.find(
          (t) => (t.position as number) === 1.5 && t.tier === 4,
        );
        expect(halfBarBeat).toBeDefined();
        expect(halfBarBeat!.label).toBe("1.4");
        // Beat 2 (position 0.5) is NOT half-bar → no label
        const beat2 = result.ticks.find(
          (t) => (t.position as number) === 0.5 && t.tier === 4,
        );
        expect(beat2).toBeDefined();
        expect(beat2!.label).toBeNull();
      });

      it("custom minLabelSpacingPx overrides default", () => {
        // scale=50, minLabelSpacingPx=40: beat * 50 = 50px >= 40 → beats get labels
        const result = computeRulerTicks(input({ scale: 50, minLabelSpacingPx: 40 }));
        const beatTick = result.ticks.find(
          (t) => (t.position as number) === 1 && t.tier === 4,
        );
        expect(beatTick?.label).toBe("1.2");
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
          (t) => Math.abs((t.position as number) + 4) < 0.001 && t.tier >= 5,
        );
        expect(barAt4).toBeDefined();
        expect(barAt4!.label).toBe("0");
        // Bar at position -8 → bar -1
        const barAt8 = result.ticks.find(
          (t) => Math.abs((t.position as number) + 8) < 0.001 && t.tier >= 5,
        );
        expect(barAt8).toBeDefined();
        expect(barAt8!.label).toBe("-1");
      });

      it("custom minSpacingPx", () => {
        // With minSpacing=20: beat/2 (0.5) * 50 = 25px >= 20 → tier 3 (eighths)
        const result = computeRulerTicks(input({ scale: 50, minSpacingPx: 20 }));
        expect(result.finestTier).toBe(3);
      });

      it("maxSubdivisions=32 enables 128th note ticks", () => {
        // beat/32 (0.03125) * 1600 = 50px >= 40 → tier -1 (128ths)
        const result = computeRulerTicks(
          input({ scale: 1600, maxSubdivisions: 32, viewSize: QN(4) }),
        );
        expect(result.finestTier).toBe(-1);
        const tier128 = result.ticks.filter((t) => t.tier === -1);
        expect(tier128.length).toBeGreaterThan(0);
      });

      it("maxSubdivisions=4 limits to sixteenths", () => {
        // beat/4 (0.25) = finest, even at high zoom beat/8 won't appear
        // scale=800: beat/4*800=200>=40, beat/8 not in the set
        const result = computeRulerTicks(
          input({ scale: 800, maxSubdivisions: 4, viewSize: QN(4) }),
        );
        expect(result.finestTier).toBe(2); // sixteenths
        const subSixteenths = result.ticks.filter((t) => t.tier < 2);
        expect(subSixteenths.length).toBe(0);
      });

      it("6/8 beat labels count eighth notes", () => {
        // 6/8: beat=0.5, bar=3. At beat level, 6 beats per bar.
        // scale=200: beat * 200 = 100px >= 80 → beats get labels
        const result = computeRulerTicks(
          input({
            timeSignature: TimeSignature.compound,
            scale: 200,
            viewSize: QN(6),
          }),
        );
        const beat2 = result.ticks.find((t) => (t.position as number) === 0.5 && t.tier === 4);
        expect(beat2?.label).toBe("1.2");
        const beat6 = result.ticks.find((t) => (t.position as number) === 2.5 && t.tier === 4);
        expect(beat6?.label).toBe("1.6");
      });
    });
  });
});
