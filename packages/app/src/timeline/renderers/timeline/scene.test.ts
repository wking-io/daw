import { describe, expect, it } from "bun:test";
import type { Clip } from "@daw/core/domain/clip";
import type { MidiPattern } from "@daw/core/domain/project";
import type { Track } from "@daw/core/domain/track";
import * as QN from "@daw/core/lib/qn";
import * as Px from "@daw/core/lib/px";
import * as PV from "@daw/core/lib/project-view";
import * as Span from "@daw/core/lib/span";
import * as TimeSignature from "@daw/core/lib/time-signature";
import { ProjectVersion } from "@daw/core/versions";
import { Option } from "effect";
import type { TimelineEnv, TimelineTheme } from "../core";
import { ProjectionContext } from "../../lib/projection-context";
import { TimelineSceneRenderer } from "./scene";
import type { TimelineData, UIState, TrackColor } from "./types";

const MOCK_THEME: TimelineTheme = {
  gridLine: "oklch(37.67% 0.0074 66.2)",
  gridLabel: "oklch(55% 0.01 66.2)",
  resolveColor: (name: string) => `resolved-${name}`,
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

  const ctx = new ProjectionContext(timeline, rules);
  // Stub dispatchEvent — Bun's test runner rejects `new Event()` for native EventTarget
  ctx.dispatchEvent = () => true;
  ctx.setContainerWidth(Px.Px(width));
  return ctx;
}

function createMockEnv(
  options: {
    canvasHeight?: number;
    fitToHeight?: boolean;
    surface?: "main" | "navigator";
  } = {},
): TimelineEnv {
  const { canvasHeight = 200, fitToHeight = true, surface = "main" } = options;

  return {
    surface,
    fitToHeight,
    canvasHeight: Px.Px(canvasHeight),
    theme: MOCK_THEME,
  };
}

const PROJECT_ID = "test-project" as any;
let patternCounter = 0;

function createTrack(id: string, name: string, color: TrackColor = "iris"): Track {
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
      span: Span.make(QN.Numeric, start, end - start),
      loop: { enabled: false, length: QN.QN(end - start) },
      sortOrder: 0,
      payload: { kind: "midi", patternId },
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

describe("timeline/renderers/daw-skeleton/scene", () => {
  describe("TimelineSceneRenderer", () => {
    it("has correct kind", () => {
      expect(TimelineSceneRenderer.kind).toBe("daw-skeleton");
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

        const gridLines = scene.canvas.filter((n) => n.kind === "line");

        // Beat-level ticks, minus edges filtered out
        expect(gridLines.length).toBeGreaterThanOrEqual(3);
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

        const gridLines = scene.canvas.filter((n) => n.kind === "line");

        // Should have grid lines
        expect(gridLines.length).toBeGreaterThan(0);
      });

      it("calculates track height with fitToHeight for dom clip positioning", () => {
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
        const env = createMockEnv({ canvasHeight: 200, fitToHeight: true });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // With 4 tracks and height 200, each track is 50px
        // Clips should be positioned at y = 3, 53, 103, 153 (with 3px padding)
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(4);

        // Group clip property contains the position
        const yPositions = clipGroups.map((g) => {
          if (g.kind === "group" && g.clip) return g.clip.y;
          return null;
        });

        expect(yPositions).toContain(3); // track 0: 0 + 3
        expect(yPositions).toContain(53); // track 1: 50 + 3
        expect(yPositions).toContain(103); // track 2: 100 + 3
        expect(yPositions).toContain(153); // track 3: 150 + 3

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

      it("uses default track height when fitToHeight is false for dom clip positioning", () => {
        const data = createTimelineData(
          [createTrack("t1", "Track 1"), createTrack("t2", "Track 2")],
          [createClip("c1", "t1", 0, 50, "Clip 1"), createClip("c2", "t2", 0, 50, "Clip 2")],
        );
        const projection = createMockProjection({ scale: 1 });
        const env = createMockEnv({ canvasHeight: 200, fitToHeight: false });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Default track height is 28px
        // Clips should be at y = 3, 31 (with 3px padding)
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(2);

        // Group clip property contains the position
        const yPositions = clipGroups.map((g) => {
          if (g.kind === "group" && g.clip) return g.clip.y;
          return null;
        });

        expect(yPositions).toContain(3); // track 0: 0 + 3
        expect(yPositions).toContain(31); // track 1: 28 + 3
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
        const env = createMockEnv({ canvasHeight: 100, fitToHeight: true });

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
        const env = createMockEnv({ canvasHeight: 200, fitToHeight: true });

        const scene = TimelineSceneRenderer.buildScene({
          data,
          projection,
          state: createUiState(),
          env,
        });

        // Track height = 200 / 2 = 100px
        // Clip padding = 3px vertical
        const clipGroups = scene.dom.filter((n) => n.kind === "group");
        expect(clipGroups.length).toBe(2);

        // First clip (track 0): y = 0 + 3 = 3 (position in group.clip)
        const clip1 = clipGroups[0];
        if (clip1?.kind === "group" && clip1.clip) {
          expect(clip1.clip.y).toBe(3); // Track 0 top + padding
        }

        // Second clip (track 1): y = 100 + 3 = 103 (position in group.clip)
        const clip2 = clipGroups[1];
        if (clip2?.kind === "group" && clip2.clip) {
          expect(clip2.clip.y).toBe(103); // Track 1 top + padding
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
        const env = createMockEnv({ canvasHeight: 200, fitToHeight: true });

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

      it("includes clip title as text node", () => {
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
        const env = createMockEnv({ canvasHeight: 100 });

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

        // Verify structure
        expect(scene.canvas[0]?.kind).toBe("line"); // grid line
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
          fitToHeight: true,
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
          fitToHeight: true,
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
          fitToHeight: true,
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
          fitToHeight: true,
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
          fitToHeight: true,
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
          fitToHeight: true,
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
    });
  });
});
