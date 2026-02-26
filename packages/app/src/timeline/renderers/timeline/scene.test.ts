import { describe, expect, it } from "bun:test";
import type { Clip } from "@daw/core/domain/clip";
import type { MidiPattern } from "@daw/core/domain/project";
import type { Track } from "@daw/core/domain/track";
import * as QN from "@daw/core/lib/qn";
import * as Px from "@daw/core/lib/px";
import * as PV from "@daw/core/domain/project-view";
import * as Span from "@daw/core/lib/span";
import * as TimeSignature from "@daw/core/lib/time-signature";
import { ProjectVersion } from "@daw/core/versions";
import { Option } from "effect";
import type { TimelineEnv, TimelineTheme } from "../core";
import { ProjectionContext } from "../../lib/projection-context";
import type { LinesNode } from "../../scene/types";
import { TimelineSceneRenderer } from "./scene";
import type { TimelineData, UIState, TrackColor } from "./types";

const MOCK_THEME: TimelineTheme = {
  tick: "oklch(37.67% 0.0074 66.2)",
  gridLinePrimary: "oklch(37.67% 0.0074 66.2)",
  gridLineSecondary: "oklch(30% 0.005 66.2)",
  gridLabel: "oklch(55% 0.01 66.2)",
  barBackground: "oklch(90% 0.01 66.2)",
  resolveColor: (color: TrackColor, _name: string) => `resolved-${color}`,
  resolveClipColor: (name: string) => `resolved-clip-${name}`,
};

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockProjection(options: {
  viewStart?: number;
  viewSize?: number;
  scale?: number;
}): ProjectionContext {
  const { viewStart = 0, viewSize = 100, scale = 1 } = options;
  const width = viewSize * scale;

  const timeline = {
    size: QN.QN(1000),
    view: { start: QN.QN(viewStart), size: QN.QN(viewSize) },
    min: QN.QN(0),
  };

  const rules = {
    scale: () => scale,
    origin: (ctx: ProjectionContext) => ctx.view.start,
  };

  const ctx = new ProjectionContext(() => timeline, rules);
  // Stub dispatchEvent — Bun's test runner rejects `new Event()` for native EventTarget
  ctx.dispatchEvent = () => true;
  ctx.setContainerWidth(Px.Px(width));
  return ctx;
}

function createMockEnv(
  options: {
    canvasHeight?: number;
    surface?: "main" | "navigator";
  } = {},
): TimelineEnv {
  const { canvasHeight = 200, surface = "main" } = options;

  return {
    surface,
    canvasHeight: Px.Px(canvasHeight),
    theme: MOCK_THEME,
  };
}

const PROJECT_ID = "test-project" as any;
let patternCounter = 0;

function createTrack(
  id: string,
  name: string,
  color: TrackColor = "iris",
  opts: { compact?: boolean; heightMultiplier?: number } = {},
): Track {
  return {
    id: id as any,
    projectId: PROJECT_ID,
    type: "midi",
    name,
    color,
    volumeDb: 0,
    pan: 0,
    mute: false,
    solo: false,
    compact: opts.compact ?? false,
    heightMultiplier: opts.heightMultiplier ?? 4,
    sortOrder: 0,
    deviceIds: [],
  };
}

function createClip(
  id: string,
  trackId: string,
  start: number,
  end: number,
  title: string,
): { clip: Clip; pattern: MidiPattern } {
  const patternId = `pattern-${++patternCounter}` as any;
  return {
    clip: {
      id: id as any,
      projectId: PROJECT_ID,
      trackId: trackId as any,
      span: Span.make(QN.QN(start), QN.QN(end - start)),
      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId, length: QN.QN(end - start) },
    },
    pattern: {
      id: patternId,
      projectId: PROJECT_ID,
      name: title,
      notes: [],
    },
  };
}

function createTimelineData(
  tracks: Track[],
  clipEntries: ReturnType<typeof createClip>[],
): TimelineData {
  const project = {
    id: PROJECT_ID,
    name: "Test Project",
    version: ProjectVersion.make(0),
    bpm: 120,
    timeSignature: TimeSignature.common,
    tracks,
    clips: clipEntries.map((e) => e.clip),
    midiPatterns: clipEntries.map((e) => e.pattern),
    automationLanes: [],
    audioFiles: [],
    deletedAt: Option.none(),
  };
  return {
    project,
    view: PV.fromProject(project),
  };
}

function createUiState(selectedClipId: string | null = null): UIState {
  return { selectedClipId };
}

// =============================================================================
// Tests
// =============================================================================

describe("timeline/renderers/timeline/scene", () => {
  describe("TimelineSceneRenderer", () => {
    it("has correct kind", () => {
      expect(TimelineSceneRenderer.kind).toBe("timeline");
    });

    describe("buildScene - canvas nodes", () => {
      it("generates vertical grid lines from ruler ticks", () => {
        const data = createTimelineData([], []);
        const projection = createMockProjection({
          viewStart: 0,
          viewSize: 16,
          scale: 50, // beat (1 QN) * 50 = 50px >= 40 → beat-level ticks
        });
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const gridSegments = scene.canvas
          .filter((n): n is LinesNode => n.kind === "lines")
          .reduce((sum, n) => sum + n.segments.length, 0);

        // Beat-level ticks, minus edges filtered out
        expect(gridSegments).toBeGreaterThanOrEqual(3);
      });

      it("positions grid lines based on view offset", () => {
        const data = createTimelineData([], []);
        const projection = createMockProjection({
          viewStart: 50,
          viewSize: 16,
          scale: 50,
        });
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const gridSegments = scene.canvas
          .filter((n): n is LinesNode => n.kind === "lines")
          .reduce((sum, n) => sum + n.segments.length, 0);

        // Should have grid lines
        expect(gridSegments).toBeGreaterThan(0);
      });

      it("positions clips at per-track heights", () => {
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1"),
            createTrack("t2", "Track 2"),
            createTrack("t3", "Track 3"),
            createTrack("t4", "Track 4"),
          ],
          [
            createClip("c1", "t1", 0, 50, "Clip 1"),
            createClip("c2", "t2", 0, 50, "Clip 2"),
            createClip("c3", "t3", 0, 50, "Clip 3"),
            createClip("c4", "t4", 0, 50, "Clip 4"),
          ],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 500 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Each track is 110px (22 + 4*22)
        // Track list starts at y=1 (TRACK_LIST_VERTICAL_PADDING)
        // Clips have 1px vertical padding (CLIP_VERTICAL_PADDING)
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(4);

        const yPositions = clipGroups.map((g) => {
          if (g.kind === "group" && g.clip) return g.clip.y;
          return null;
        });

        expect(yPositions).toContain(2); // track 0: 1 + 1
        expect(yPositions).toContain(112); // track 1: 111 + 1
        expect(yPositions).toContain(222); // track 2: 221 + 1
        expect(yPositions).toContain(332); // track 3: 331 + 1

        // Children should be at 0,0 relative to group
        for (const g of clipGroups) {
          if (g.kind === "group") {
            const rect = g.children[0];
            if (rect?.kind === "rect") {
              expect(rect.rect.x).toBe(0);
              expect(rect.rect.y).toBe(0);
            }
          }
        }
      });

      it("positions compact tracks at 22px height", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1", "iris", { compact: true }), createTrack("t2", "Track 2")],
          [
            createClip("c1", "t1", 0, 50, "Compact Clip"),
            createClip("c2", "t2", 0, 50, "Normal Clip"),
          ],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 200 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(2);

        const yPositions = clipGroups.map((g) => {
          if (g.kind === "group" && g.clip) return g.clip.y;
          return null;
        });

        // Track list starts at y=1 (TRACK_LIST_VERTICAL_PADDING)
        // Compact track: 24px (22 + 1*2 padding), clip at y=2 with height 22
        expect(yPositions).toContain(2); // track 0 (compact): 1 + 1
        expect(yPositions).toContain(26); // track 1: 25 + 1

        // Verify compact track clip height
        const compactClip = clipGroups[0];
        if (compactClip?.kind === "group" && compactClip.clip) {
          expect(compactClip.clip.height).toBe(22); // TITLE_BAR_HEIGHT (no padding subtracted)
        }

        // Verify normal track clip height
        const normalClip = clipGroups[1];
        if (normalClip?.kind === "group" && normalClip.clip) {
          expect(normalClip.clip.height).toBe(108); // 110 - 1*2 = 108
        }
      });

      it("handles mixed compact/non-compact tracks with varying multipliers", () => {
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1", "iris", { compact: false, heightMultiplier: 2 }),
            createTrack("t2", "Track 2", "iris", { compact: true }),
            createTrack("t3", "Track 3", "iris", { compact: false, heightMultiplier: 6 }),
          ],
          [
            createClip("c1", "t1", 0, 50, "Small"),
            createClip("c2", "t2", 0, 50, "Compact"),
            createClip("c3", "t3", 0, 50, "Large"),
          ],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 500 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(3);

        const yPositions = clipGroups.map((g) => {
          if (g.kind === "group" && g.clip) return g.clip.y;
          return null;
        });

        // Track list starts at y=1 (TRACK_LIST_VERTICAL_PADDING)
        // Track 0: 22 + 2*22 = 66px, clip at y=1+1=2
        // Track 1: compact = 24px (22 + 1*2), clip at y=1+66+1=68
        // Track 2: 22 + 6*22 = 154px, clip at y=1+66+24+1=92
        expect(yPositions).toContain(2); // track 0: 1 + 1
        expect(yPositions).toContain(68); // track 1: 67 + 1
        expect(yPositions).toContain(92); // track 2: 91 + 1
      });
    });

    describe("buildScene - dom nodes", () => {
      it("always includes background hit area for deselection", () => {
        const data = createTimelineData([], []);
        const projection = createMockProjection({ scale: 4 });
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const bgNode = scene.dom[0];
        expect(bgNode?.kind).toBe("rect");
        if (bgNode?.kind === "rect") {
          expect(bgNode.rect).toEqual({ x: 0, y: 0, width: 400, height: 200 });
          expect(bgNode.action).toEqual({ type: "select-clip", clipId: null });
        }
      });

      it("generates clip group nodes", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 0, 100, "Clip 1")],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 200 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Should have background + 1 clip group
        expect(scene.dom.length).toBe(2);

        const clipGroup = scene.dom[1];
        expect(clipGroup?.kind).toBe("group");
        if (clipGroup?.kind === "group") {
          expect(clipGroup.action).toEqual({
            type: "select-clip",
            clipId: "c1",
          });
          expect(clipGroup.children.length).toBe(2); // rect + text
        }
      });

      it("positions clips correctly on their tracks", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1"), createTrack("t2", "Track 2")],
          [
            createClip("c1", "t1", 0, 50, "Track 1 Clip"),
            createClip("c2", "t2", 25, 75, "Track 2 Clip"),
          ],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 300 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Track height = 110px (22 + 4*22)
        // Track list starts at y=1 (TRACK_LIST_VERTICAL_PADDING)
        // Clip padding = 1px vertical
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(2);

        // First clip (track 0): y = 1 + 1 = 2
        const clip1 = clipGroups[0];
        if (clip1?.kind === "group" && clip1.clip) {
          expect(clip1.clip.y).toBe(2);
        }

        // Second clip (track 1): y = 111 + 1 = 112
        const clip2 = clipGroups[1];
        if (clip2?.kind === "group" && clip2.clip) {
          expect(clip2.clip.y).toBe(112);
        }
      });

      it("calculates clip width from start/end positions", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 10, 60, "Clip")],
        );
        const projection = createMockProjection({ scale: 2 });
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const clipGroup = scene.dom.find((n) => n.kind === "group");
        if (clipGroup?.kind === "group" && clipGroup.clip) {
          // Start at 10, end at 60, scale 2
          // Screen x = (10 - 0) * 2 = 20
          // Width = (60 - 10) * 2 = 100
          expect(clipGroup.clip.x).toBe(20);
          expect(clipGroup.clip.width).toBe(100);

          // Children are positioned at 0,0 relative to group
          const clipRect = clipGroup.children[0];
          if (clipRect?.kind === "rect") {
            expect(clipRect.rect.x).toBe(0);
            expect(clipRect.rect.width).toBe(100);
          }
        }
      });

      it("applies selected styling to selected clip using track color", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1", "tangerine")],
          [
            createClip("c1", "t1", 0, 50, "Selected"),
            createClip("c2", "t1", 60, 100, "Not Selected"),
          ],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState("c1"), // c1 is selected
          env,
        });

        const clipGroups = scene.dom.filter((n) => n.kind === "group");

        // First clip (selected) - uses CSS var fill with selected border
        const selectedClip = clipGroups[0];
        if (selectedClip?.kind === "group") {
          const rect = selectedClip.children[0];
          if (rect?.kind === "rect") {
            expect(rect.fill).toBe("var(--color-tangerine-primary)");
            expect(rect.stroke?.color).toBe("var(--color-clip-border-selected)");
          }
        }

        // Second clip (not selected) - uses CSS var fill and active border
        const unselectedClip = clipGroups[1];
        if (unselectedClip?.kind === "group") {
          const rect = unselectedClip.children[0];
          if (rect?.kind === "rect") {
            expect(rect.fill).toBe("var(--color-tangerine-primary)");
            expect(rect.stroke?.color).toBe("var(--color-tangerine-primary-active)");
          }
        }
      });

      it("uses different colors for clips on different tracks", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1", "strawberry"), createTrack("t2", "Track 2", "emerald")],
          [
            createClip("c1", "t1", 0, 50, "Strawberry Clip"),
            createClip("c2", "t2", 0, 50, "Emerald Clip"),
          ],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 300 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(2);

        // First clip (strawberry track)
        const clip1 = clipGroups[0];
        if (clip1?.kind === "group") {
          const rect = clip1.children[0];
          if (rect?.kind === "rect") {
            expect(rect.fill).toBe("var(--color-strawberry-primary)");
            expect(rect.stroke?.color).toBe("var(--color-strawberry-primary-active)");
          }
        }

        // Second clip (emerald track)
        const clip2 = clipGroups[1];
        if (clip2?.kind === "group") {
          const rect = clip2.children[0];
          if (rect?.kind === "rect") {
            expect(rect.fill).toBe("var(--color-emerald-primary)");
            expect(rect.stroke?.color).toBe("var(--color-emerald-primary-active)");
          }
        }
      });

      it("includes clip title as text node centered in title bar", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 0, 100, "My Awesome Clip")],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const clipGroup = scene.dom.find((n) => n.kind === "group");
        if (clipGroup?.kind === "group") {
          const textNode = clipGroup.children[1];
          expect(textNode?.kind).toBe("text");
          if (textNode?.kind === "text") {
            expect(textNode.text).toBe("My Awesome Clip");
            expect(textNode.style.font).toBe("12px system-ui, sans-serif");
            expect(textNode.style.color).toBe("var(--color-iris-primary-foreground)");
            expect(textNode.style.baseline).toBe("middle");
            // Text should be centered in title bar (22/2 = 11)
            expect(textNode.position.y).toBe(11);
          }
        }
      });

      it("skips clips with invalid track IDs", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [
            createClip("c1", "t1", 0, 50, "Valid"),
            createClip("c2", "invalid-track", 60, 100, "Invalid"),
          ],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Should only have background + 1 valid clip
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(1);
      });

      it("ensures minimum clip width of 1px", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 50, 50, "Zero Width")], // start === end
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        const clipGroup = scene.dom.find((n) => n.kind === "group");
        if (clipGroup?.kind === "group") {
          const clipRect = clipGroup.children[0];
          if (clipRect?.kind === "rect") {
            expect(clipRect.rect.width).toBe(1); // Minimum width
          }
        }
      });

      it("handles empty tracks array", () => {
        const data = createTimelineData([], []);
        const projection = createMockProjection({});
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Should still have grid lines in canvas and hit area in dom
        expect(scene.canvas.length).toBeGreaterThanOrEqual(1); // grid lines
        expect(scene.dom.length).toBe(1); // just hit area
      });

      it("handles many clips across multiple tracks", () => {
        const tracks = [
          createTrack("t1", "Track 1"),
          createTrack("t2", "Track 2"),
          createTrack("t3", "Track 3"),
        ];
        const clips = [
          createClip("c1", "t1", 0, 50, "Clip 1"),
          createClip("c2", "t1", 60, 100, "Clip 2"),
          createClip("c3", "t2", 0, 80, "Clip 3"),
          createClip("c4", "t3", 20, 90, "Clip 4"),
        ];
        const data = createTimelineData(tracks, clips);
        const projection = createMockProjection({});
        const env = createMockEnv({});

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Background + 4 clip groups
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(4);

        // All clips should have select-clip actions
        for (const group of clipGroups) {
          if (group.kind === "group") {
            expect(group.action?.type).toBe("select-clip");
            expect(group.action?.clipId).toBeTruthy();
          }
        }
      });
    });

    describe("buildScene - integration", () => {
      it("produces complete scene with canvas and dom nodes", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1"), createTrack("t2", "Track 2")],
          [createClip("c1", "t1", 0, 100, "Clip A"), createClip("c2", "t2", 50, 150, "Clip B")],
        );
        const projection = createMockProjection({
          viewStart: 0,
          viewSize: 200,
          scale: 1,
        });
        const env = createMockEnv({ canvasHeight: 300 });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState("c1"),
          env,
        });

        // Canvas should have grid lines
        expect(scene.canvas.length).toBeGreaterThanOrEqual(1);

        // DOM should have: hit area + 2 clip groups
        expect(scene.dom.length).toBe(3);

        // Verify canvas contains grid lines (bar backgrounds may come first)
        expect(scene.canvas.some((n) => n.kind === "line")).toBe(true);
        expect(scene.dom[0]?.kind).toBe("rect"); // hit area
        expect(scene.dom[1]?.kind).toBe("group"); // clip 1
        expect(scene.dom[2]?.kind).toBe("group"); // clip 2
      });
    });

    describe("buildScene - navigator surface", () => {
      it("returns empty dom array for navigator surface", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 0, 100, "Clip 1")],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({ surface: "navigator" });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Navigator should have no interactive DOM elements
        expect(scene.dom).toEqual([]);
      });

      it("does not render track lane backgrounds for navigator", () => {
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1"),
            createTrack("t2", "Track 2"),
            createTrack("t3", "Track 3"),
          ],
          [],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({
          canvasHeight: 300,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // No track lane rects (just separator lines between tracks)
        const rects = scene.canvas.filter((n) => n.kind === "rect");
        expect(rects.length).toBe(0); // No background or track lane rects

        // Should have 2 separator lines (between tracks)
        const lines = scene.canvas.filter((n) => n.kind === "line");
        expect(lines.length).toBe(2);
      });

      it("renders clips as simple filled rects for navigator", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 0, 50, "Clip 1"), createClip("c2", "t1", 60, 100, "Clip 2")],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({
          canvasHeight: 100,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Should have 2 clip rects (no background or track lane rects)
        const rects = scene.canvas.filter((n) => n.kind === "rect");
        expect(rects.length).toBe(2);

        // Clip rects should use resolved track color (default "iris")
        const clipRects = rects.filter((r) => r.kind === "rect" && r.fill === "resolved-iris");
        expect(clipRects.length).toBe(2);
      });

      it("does not render text or borders for navigator clips", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 0, 100, "Clip with title")],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({ surface: "navigator" });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // No text nodes
        const textNodes = scene.canvas.filter((n) => n.kind === "text");
        expect(textNodes.length).toBe(0);

        // No group nodes
        const groupNodes = scene.canvas.filter((n) => n.kind === "group");
        expect(groupNodes.length).toBe(0);
      });

      it("renders track separator lines for navigator", () => {
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1"),
            createTrack("t2", "Track 2"),
            createTrack("t3", "Track 3"),
          ],
          [],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({
          canvasHeight: 300,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // With 3 tracks, we should have 2 separator lines (between tracks)
        const lineNodes = scene.canvas.filter((n) => n.kind === "line");
        expect(lineNodes.length).toBe(2);

        // Lines should be at track boundaries (100.5 and 200.5 for crisp rendering)
        const yPositions = lineNodes.map((n) => (n.kind === "line" ? n.points[0]?.y : null));
        expect(yPositions).toContain(100.5); // Between track 0 and 1
        expect(yPositions).toContain(200.5); // Between track 1 and 2
      });

      it("does not render track separators for single track in navigator", () => {
        const data = createTimelineData([createTrack("t1", "Track 1")], []);
        const projection = createMockProjection({});
        const env = createMockEnv({ surface: "navigator" });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // No lines for single track (no borders needed)
        const lineNodes = scene.canvas.filter((n) => n.kind === "line");
        expect(lineNodes.length).toBe(0);
      });

      it("does not render track separators for more than 4 tracks in navigator", () => {
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1"),
            createTrack("t2", "Track 2"),
            createTrack("t3", "Track 3"),
            createTrack("t4", "Track 4"),
            createTrack("t5", "Track 5"),
          ],
          [],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({
          canvasHeight: 500,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // No separator lines when more than 4 tracks
        const lineNodes = scene.canvas.filter((n) => n.kind === "line");
        expect(lineNodes.length).toBe(0);
      });

      it("renders track separators for exactly 4 tracks in navigator", () => {
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1"),
            createTrack("t2", "Track 2"),
            createTrack("t3", "Track 3"),
            createTrack("t4", "Track 4"),
          ],
          [],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({
          canvasHeight: 400,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // 3 separator lines for 4 tracks
        const lineNodes = scene.canvas.filter((n) => n.kind === "line");
        expect(lineNodes.length).toBe(3);
      });

      it("ignores selection state for navigator clips", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1")],
          [createClip("c1", "t1", 0, 100, "Selected Clip")],
        );
        const projection = createMockProjection({});
        const env = createMockEnv({ surface: "navigator" });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState("c1"), // c1 is selected
          env,
        });

        // Clip should still use the resolved navigator fill (not selection styling)
        const clipRects = scene.canvas.filter(
          (n) => n.kind === "rect" && n.fill === "resolved-iris",
        );
        expect(clipRects.length).toBe(1);
      });

      it("uses track colors for navigator clips", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1", "strawberry"), createTrack("t2", "Track 2", "emerald")],
          [
            createClip("c1", "t1", 0, 50, "Strawberry Clip"),
            createClip("c2", "t2", 0, 50, "Emerald Clip"),
          ],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({
          canvasHeight: 200,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Find clip rects by their resolved track colors
        const strawberryRects = scene.canvas.filter(
          (n) => n.kind === "rect" && n.fill === "resolved-strawberry",
        );
        const emeraldRects = scene.canvas.filter(
          (n) => n.kind === "rect" && n.fill === "resolved-emerald",
        );

        expect(strawberryRects.length).toBe(1);
        expect(emeraldRects.length).toBe(1);
      });

      it("navigator uses uniform fit-to-height regardless of track settings", () => {
        // Even though tracks have different compact/multiplier settings,
        // navigator should use uniform fit-to-height
        const data = createTimelineData(
          [
            createTrack("t1", "Track 1", "iris", { compact: true }),
            createTrack("t2", "Track 2", "iris", { compact: false, heightMultiplier: 8 }),
          ],
          [createClip("c1", "t1", 0, 50, "Compact"), createClip("c2", "t2", 0, 50, "Tall")],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({
          canvasHeight: 200,
          surface: "navigator",
        });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Both clips should be positioned with uniform 100px track height (200/2)
        const rects = scene.canvas.filter((n) => n.kind === "rect");
        expect(rects.length).toBe(2);

        // Check heights are equal (both should be canvasHeight/trackCount = 100)
        if (rects[0]?.kind === "rect" && rects[1]?.kind === "rect") {
          expect(rects[0].rect.height).toBe(rects[1].rect.height);
        }
      });
    });
  });
});
