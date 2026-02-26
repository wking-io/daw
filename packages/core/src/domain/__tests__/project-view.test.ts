import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import type { AudioFile, AutomationLane, Clip, MidiPattern, Project, Track } from "../project";
import { evolve } from "../project";
import type { EditorEvent } from "../../events/editor";
import type { ClipId } from "../../ids";
import * as QN from "../../lib/qn";
import * as Sec from "../../lib/sec";
import * as Span from "../../lib/span";
import * as PV from "../project-view";
import * as SI from "../../lib/spatial-index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const projectId = "proj-1" as any;

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: projectId,
    name: "Test Project",
    version: 0 as any,
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 } as any,
    tracks: [],
    clips: [],
    midiPatterns: [],
    automationLanes: [],
    audioFiles: [],
    deletedAt: Option.none(),
    ...overrides,
  };
}

function makeTrack(id: string, overrides: Partial<any> = {}): Track {
  return {
    id: id as any,
    projectId,
    type: "midi" as const,
    name: `Track ${id}`,
    color: "tangerine",
    volumeDb: 0,
    pan: 0,
    mute: false,
    solo: false,
    compact: false,
    heightMultiplier: 4,
    sortOrder: 0,
    deviceIds: [],
    ...overrides,
  };
}

function makeClip(
  id: string,
  trackId: string,
  start: number,
  size: number,
  patternId = `pat-${id}`,
): Clip {
  return {
    id: id as any,
    projectId,
    trackId: trackId as any,
    span: Span.make(QN.QN(start), QN.QN(size)),
    sortOrder: 0,
    offset: QN.zero,
    payload: { kind: "midi" as const, patternId: patternId as any, length: QN.QN(size) },
  };
}

function makeAudioClip(
  id: string,
  trackId: string,
  start: number,
  size: number,
  audioFileId: string,
): Clip {
  return {
    id: id as any,
    projectId,
    trackId: trackId as any,
    span: Span.make(QN.QN(start), QN.QN(size)),
    sortOrder: 0,
    offset: QN.zero,
    payload: {
      kind: "audio" as const,
      audioFileId: audioFileId as any,
      offset: Sec.zero,
      length: QN.QN(size),
    },
  };
}

function makePattern(id: string, name: string): MidiPattern {
  return { id: id as any, projectId, name, notes: [] };
}

function makeAudioFile(id: string, name: string): AudioFile {
  return {
    id: id as any,
    projectId,
    name,
    originalPath: `/audio/${name}`,
    storedPath: `/audio/${name}`,
    duration: Sec.Sec(10),
    sampleRate: 44100,
    channels: 2,
  };
}

function makeLane(id: string, trackId: string): AutomationLane {
  return { id: id as any, projectId, trackId: trackId as any, paramPath: "volume", points: [] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/project-view", () => {
  describe("fromProject", () => {
    it("builds all maps from a populated project", () => {
      const project = makeProject({
        tracks: [makeTrack("t1"), makeTrack("t2")],
        clips: [makeClip("c1", "t1", 0, 4), makeClip("c2", "t2", 8, 4)],
        midiPatterns: [makePattern("pat-c1", "Beat"), makePattern("pat-c2", "Bass")],
        audioFiles: [makeAudioFile("af1", "sample.wav")],
        automationLanes: [makeLane("lane1", "t1")],
      });

      const view = PV.fromProject(project);

      expect(view.trackById.size).toBe(2);
      expect(view.clipById.size).toBe(2);
      expect(view.patternById.size).toBe(2);
      expect(view.audioFileById.size).toBe(1);
      expect(view.automationLaneById.size).toBe(1);
      expect(view.trackOrder).toEqual(["t1", "t2"]);
      expect(view.trackIndex.get("t1")).toBe(0);
      expect(view.trackIndex.get("t2")).toBe(1);
    });

    it("builds correctly from an empty project", () => {
      const view = PV.fromProject(makeProject());

      expect(view.trackById.size).toBe(0);
      expect(view.clipById.size).toBe(0);
      expect(view.patternById.size).toBe(0);
      expect(view.audioFileById.size).toBe(0);
      expect(view.automationLaneById.size).toBe(0);
      expect(view.trackOrder).toEqual([]);
    });

    it("populates clip spatial index", () => {
      const project = makeProject({
        tracks: [makeTrack("t1")],
        clips: [makeClip("c1", "t1", 0, 4), makeClip("c2", "t1", 8, 4)],
        midiPatterns: [makePattern("pat-c1", "A"), makePattern("pat-c2", "B")],
      });

      const view = PV.fromProject(project);

      const hits = SI.query(view.clipIndex, "t1", Span.make(QN.QN(0), QN.QN(12)));
      expect(hits.sort()).toEqual(["c1", "c2"] as ClipId[]);
    });
  });

  describe("resolveClipTitle", () => {
    it("resolves midi clip title via patternById", () => {
      const project = makeProject({
        tracks: [makeTrack("t1")],
        clips: [makeClip("c1", "t1", 0, 4)],
        midiPatterns: [makePattern("pat-c1", "My Pattern")],
      });
      const view = PV.fromProject(project);

      expect(PV.resolveClipTitle(view.clipById.get("c1")!.payload, view)).toBe("My Pattern");
    });

    it("resolves audio clip title via audioFileById", () => {
      const project = makeProject({
        tracks: [makeTrack("t1")],
        clips: [makeAudioClip("c1", "t1", 0, 4, "af1")],
        audioFiles: [makeAudioFile("af1", "vocals.wav")],
      });
      const view = PV.fromProject(project);

      expect(PV.resolveClipTitle(view.clipById.get("c1")!.payload, view)).toBe("vocals.wav");
    });

    it("returns Untitled for missing pattern", () => {
      const clip = makeClip("c1", "t1", 0, 4, "missing");
      const view = PV.fromProject(makeProject());

      expect(PV.resolveClipTitle(clip.payload, view)).toBe("Untitled");
    });
  });

  describe("applyEvent", () => {
    // ----- Project events -----
    describe("project events", () => {
      it("project.created rebuilds entire view", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1")],
          }),
        );
        expect(view.trackById.size).toBe(1);

        const newProject = makeProject({
          tracks: [makeTrack("t2"), makeTrack("t3")],
        });
        PV.applyEvent(view, {
          t: "project.created",
          project: newProject,
        } as unknown as EditorEvent);

        expect(view.trackById.size).toBe(2);
        expect(view.trackById.has("t1")).toBe(false);
        expect(view.trackById.has("t2")).toBe(true);
        expect(view.trackOrder).toEqual(["t2", "t3"]);
      });

      it("project.renamed is a no-op on view", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        PV.applyEvent(view, { t: "project.renamed", name: "New Name" } as EditorEvent);
        expect(view.trackById.size).toBe(1);
      });

      it("project.tracksReordered rebuilds trackOrder and trackIndex", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1"), makeTrack("t2"), makeTrack("t3")],
          }),
        );

        PV.applyEvent(view, {
          t: "project.tracksReordered",
          trackIds: ["t3", "t1", "t2"],
        } as unknown as EditorEvent);

        expect(view.trackOrder).toEqual(["t3", "t1", "t2"]);
        expect(view.trackIndex.get("t3")).toBe(0);
        expect(view.trackIndex.get("t1")).toBe(1);
        expect(view.trackIndex.get("t2")).toBe(2);
      });
    });

    // ----- Track events -----
    describe("track events", () => {
      it("track.created adds track to maps", () => {
        const view = PV.fromProject(makeProject());
        const track = makeTrack("t1");

        PV.applyEvent(view, { t: "track.created", track } as unknown as EditorEvent);

        expect(view.trackById.has("t1")).toBe(true);
        expect(view.trackOrder).toEqual(["t1"]);
        expect(view.trackIndex.get("t1")).toBe(0);
      });

      it("track.deleted removes track and reindexes", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1"), makeTrack("t2"), makeTrack("t3")],
          }),
        );

        PV.applyEvent(view, { t: "track.deleted", trackId: "t2" } as unknown as EditorEvent);

        expect(view.trackById.has("t2")).toBe(false);
        expect(view.trackOrder).toEqual(["t1", "t3"]);
        expect(view.trackIndex.get("t1")).toBe(0);
        expect(view.trackIndex.get("t3")).toBe(1);
      });

      it("track.renamed updates name in trackById", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1", { name: "Old" })],
          }),
        );

        PV.applyEvent(view, {
          t: "track.renamed",
          trackId: "t1",
          name: "New",
        } as unknown as EditorEvent);

        expect(view.trackById.get("t1")?.name).toBe("New");
      });

      it("track.colorChanged updates color", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1", { color: "ruby" })],
          }),
        );

        PV.applyEvent(view, {
          t: "track.colorChanged",
          trackId: "t1",
          color: "cobalt",
        } as unknown as EditorEvent);

        expect(view.trackById.get("t1")?.color).toBe("cobalt");
      });

      it("track.volumeChanged updates volume", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        PV.applyEvent(view, {
          t: "track.volumeChanged",
          trackId: "t1",
          volumeDb: -6,
        } as unknown as EditorEvent);
        expect(view.trackById.get("t1")?.volumeDb).toBe(-6);
      });

      it("track.panChanged updates pan", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        PV.applyEvent(view, {
          t: "track.panChanged",
          trackId: "t1",
          pan: 0.5,
        } as unknown as EditorEvent);
        expect(view.trackById.get("t1")?.pan).toBe(0.5);
      });

      it("track.muteChanged updates mute", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        PV.applyEvent(view, {
          t: "track.muteChanged",
          trackId: "t1",
          mute: true,
        } as unknown as EditorEvent);
        expect(view.trackById.get("t1")?.mute).toBe(true);
      });

      it("track.soloChanged updates solo", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        PV.applyEvent(view, {
          t: "track.soloChanged",
          trackId: "t1",
          solo: true,
        } as unknown as EditorEvent);
        expect(view.trackById.get("t1")?.solo).toBe(true);
      });

      it("track.clipsReordered updates sortOrder on clips", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1")],
            clips: [makeClip("c1", "t1", 0, 4), makeClip("c2", "t1", 4, 4)],
            midiPatterns: [makePattern("pat-c1", "A"), makePattern("pat-c2", "B")],
          }),
        );

        PV.applyEvent(view, {
          t: "track.clipsReordered",
          trackId: "t1",
          clipIds: ["c2", "c1"],
        } as unknown as EditorEvent);

        expect(view.clipById.get("c2")?.sortOrder).toBe(0);
        expect(view.clipById.get("c1")?.sortOrder).toBe(1);
      });
    });

    // ----- Clip events -----
    describe("clip events", () => {
      it("clip.created adds clip and updates index", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        const clip = makeClip("c1", "t1", 0, 4);
        const pattern = makePattern("pat-c1", "Beat");

        PV.applyEvent(view, { t: "clip.created", clip, pattern } as unknown as EditorEvent);

        expect(view.clipById.has("c1")).toBe(true);
        expect(view.patternById.has("pat-c1")).toBe(true);
        expect(SI.query(view.clipIndex, "t1", Span.make(QN.QN(0), QN.QN(4)))).toEqual([
          "c1",
        ] as ClipId[]);
      });

      it("clip.created without pattern (audio clip)", () => {
        const view = PV.fromProject(makeProject({ tracks: [makeTrack("t1")] }));
        const clip = makeAudioClip("c1", "t1", 0, 4, "af1");

        PV.applyEvent(view, { t: "clip.created", clip } as unknown as EditorEvent);

        expect(view.clipById.has("c1")).toBe(true);
        expect(view.patternById.size).toBe(0);
      });

      it("clip.deleted removes clip and updates index", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1")],
            clips: [makeClip("c1", "t1", 0, 4)],
            midiPatterns: [makePattern("pat-c1", "Beat")],
          }),
        );

        PV.applyEvent(view, { t: "clip.deleted", clipId: "c1" } as unknown as EditorEvent);

        expect(view.clipById.has("c1")).toBe(false);
        expect(SI.query(view.clipIndex, "t1", Span.make(QN.QN(0), QN.QN(4)))).toEqual([]);
      });

      it("clip.moved updates position and index", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1"), makeTrack("t2")],
            clips: [makeClip("c1", "t1", 0, 4)],
            midiPatterns: [makePattern("pat-c1", "Beat")],
          }),
        );

        PV.applyEvent(view, {
          t: "clip.moved",
          clipId: "c1",
          start: QN.QN(8),
          trackId: "t2",
        } as unknown as EditorEvent);

        const clip = view.clipById.get("c1")!;
        expect(Number(clip.span.start)).toBe(8);
        expect(String(clip.trackId)).toBe("t2");
        expect(SI.query(view.clipIndex, "t1", Span.make(QN.QN(0), QN.QN(12)))).toEqual([]);
        expect(SI.query(view.clipIndex, "t2", Span.make(QN.QN(8), QN.QN(4)))).toEqual([
          "c1",
        ] as ClipId[]);
      });

      it("clip.resized updates span and index", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1")],
            clips: [makeClip("c1", "t1", 0, 4)],
            midiPatterns: [makePattern("pat-c1", "Beat")],
          }),
        );

        PV.applyEvent(view, {
          t: "clip.resized",
          clipId: "c1",
          span: Span.make(QN.QN(0), QN.QN(12)),
        } as unknown as EditorEvent);

        expect(Number(view.clipById.get("c1")!.span.size)).toBe(12);
        expect(SI.query(view.clipIndex, "t1", Span.make(QN.QN(8), QN.QN(4)))).toEqual([
          "c1",
        ] as ClipId[]);
      });

      it("clip.loopSet transforms payload to loop variant", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1")],
            clips: [makeClip("c1", "t1", 0, 4)],
            midiPatterns: [makePattern("pat-c1", "Beat")],
          }),
        );

        PV.applyEvent(view, {
          t: "clip.loopSet",
          clipId: "c1",
          loop: { start: QN.QN(0), size: QN.QN(4) },
        } as unknown as EditorEvent);

        const clip = view.clipById.get("c1")!;
        expect(clip.payload.kind).toBe("midi-loop");
        if (clip.payload.kind === "midi-loop") {
          expect(Number(clip.payload.loop.size)).toBe(4);
        }
      });

      it("clip.loopRemoved transforms payload back to non-loop variant", () => {
        const view = PV.fromProject(
          makeProject({
            tracks: [makeTrack("t1")],
            clips: [
              {
                ...makeClip("c1", "t1", 0, 4),
                payload: {
                  kind: "midi-loop" as const,
                  patternId: "pat-c1" as any,
                  length: QN.QN(4),
                  loop: { start: QN.QN(0), size: QN.QN(4) },
                },
              },
            ],
            midiPatterns: [makePattern("pat-c1", "Beat")],
          }),
        );

        PV.applyEvent(view, {
          t: "clip.loopRemoved",
          clipId: "c1",
        } as unknown as EditorEvent);

        const clip = view.clipById.get("c1")!;
        expect(clip.payload.kind).toBe("midi");
      });
    });

    // ----- MIDI events -----
    describe("midi events", () => {
      it("midi.patternRenamed updates pattern name", () => {
        const view = PV.fromProject(
          makeProject({
            midiPatterns: [makePattern("p1", "Old")],
          }),
        );

        PV.applyEvent(view, {
          t: "midi.patternRenamed",
          patternId: "p1",
          name: "New",
        } as unknown as EditorEvent);

        expect(view.patternById.get("p1")?.name).toBe("New");
      });

      it("midi.noteAdded adds note to pattern", () => {
        const view = PV.fromProject(
          makeProject({
            midiPatterns: [makePattern("p1", "Beat")],
          }),
        );

        const note = {
          id: "n1" as any,
          pitch: 60,
          velocity: 100,
          span: Span.make(QN.QN(0), QN.QN(1)),
        };
        PV.applyEvent(view, {
          t: "midi.noteAdded",
          patternId: "p1",
          note,
        } as unknown as EditorEvent);

        expect(view.patternById.get("p1")?.notes.length).toBe(1);
        expect(String(view.patternById.get("p1")?.notes[0]?.id)).toBe("n1");
      });

      it("midi.noteDeleted removes note from pattern", () => {
        const note = {
          id: "n1" as any,
          pitch: 60,
          velocity: 100,
          span: Span.make(QN.QN(0), QN.QN(1)),
        };
        const view = PV.fromProject(
          makeProject({
            midiPatterns: [{ ...makePattern("p1", "Beat"), notes: [note] }],
          }),
        );

        PV.applyEvent(view, {
          t: "midi.noteDeleted",
          patternId: "p1",
          noteId: "n1",
        } as unknown as EditorEvent);

        expect(view.patternById.get("p1")?.notes.length).toBe(0);
      });

      it("midi.noteMoved updates note span", () => {
        const note = {
          id: "n1" as any,
          pitch: 60,
          velocity: 100,
          span: Span.make(QN.QN(0), QN.QN(1)),
        };
        const view = PV.fromProject(
          makeProject({
            midiPatterns: [{ ...makePattern("p1", "Beat"), notes: [note] }],
          }),
        );

        PV.applyEvent(view, {
          t: "midi.noteMoved",
          patternId: "p1",
          noteId: "n1",
          span: Span.make(QN.QN(4), QN.QN(2)),
        } as unknown as EditorEvent);

        const updated = view.patternById.get("p1")?.notes[0]!;
        expect(Number(updated.span.start)).toBe(4);
        expect(Number(updated.span.size)).toBe(2);
      });

      it("midi.noteVelocityChanged updates velocity", () => {
        const note = {
          id: "n1" as any,
          pitch: 60,
          velocity: 100,
          span: Span.make(QN.QN(0), QN.QN(1)),
        };
        const view = PV.fromProject(
          makeProject({
            midiPatterns: [{ ...makePattern("p1", "Beat"), notes: [note] }],
          }),
        );

        PV.applyEvent(view, {
          t: "midi.noteVelocityChanged",
          patternId: "p1",
          noteId: "n1",
          velocity: 50,
        } as unknown as EditorEvent);

        expect(view.patternById.get("p1")?.notes[0]?.velocity).toBe(50);
      });

      it("midi.notePitchChanged updates pitch", () => {
        const note = {
          id: "n1" as any,
          pitch: 60,
          velocity: 100,
          span: Span.make(QN.QN(0), QN.QN(1)),
        };
        const view = PV.fromProject(
          makeProject({
            midiPatterns: [{ ...makePattern("p1", "Beat"), notes: [note] }],
          }),
        );

        PV.applyEvent(view, {
          t: "midi.notePitchChanged",
          patternId: "p1",
          noteId: "n1",
          pitch: 72,
        } as unknown as EditorEvent);

        expect(view.patternById.get("p1")?.notes[0]?.pitch).toBe(72);
      });
    });

    // ----- Automation events -----
    describe("automation events", () => {
      it("automation.laneCreated adds lane", () => {
        const view = PV.fromProject(makeProject());
        const lane = makeLane("lane1", "t1");

        PV.applyEvent(view, { t: "automation.laneCreated", lane } as unknown as EditorEvent);

        expect(view.automationLaneById.has("lane1")).toBe(true);
      });

      it("automation.laneDeleted removes lane", () => {
        const view = PV.fromProject(
          makeProject({
            automationLanes: [makeLane("lane1", "t1")],
          }),
        );

        PV.applyEvent(view, {
          t: "automation.laneDeleted",
          laneId: "lane1",
        } as unknown as EditorEvent);

        expect(view.automationLaneById.has("lane1")).toBe(false);
      });

      it("automation.pointAdded adds point to lane", () => {
        const view = PV.fromProject(
          makeProject({
            automationLanes: [makeLane("lane1", "t1")],
          }),
        );

        const point = { id: "pt1" as any, time: QN.QN(4), value: 0.5, curve: "linear" as const };
        PV.applyEvent(view, {
          t: "automation.pointAdded",
          laneId: "lane1",
          point,
        } as unknown as EditorEvent);

        expect(view.automationLaneById.get("lane1")?.points.length).toBe(1);
      });

      it("automation.pointDeleted removes point", () => {
        const point = { id: "pt1" as any, time: QN.QN(4), value: 0.5, curve: "linear" as const };
        const view = PV.fromProject(
          makeProject({
            automationLanes: [{ ...makeLane("lane1", "t1"), points: [point] }],
          }),
        );

        PV.applyEvent(view, {
          t: "automation.pointDeleted",
          laneId: "lane1",
          pointId: "pt1",
        } as unknown as EditorEvent);

        expect(view.automationLaneById.get("lane1")?.points.length).toBe(0);
      });

      it("automation.pointMoved updates point", () => {
        const point = { id: "pt1" as any, time: QN.QN(4), value: 0.5, curve: "linear" as const };
        const view = PV.fromProject(
          makeProject({
            automationLanes: [{ ...makeLane("lane1", "t1"), points: [point] }],
          }),
        );

        PV.applyEvent(view, {
          t: "automation.pointMoved",
          laneId: "lane1",
          pointId: "pt1",
          time: QN.QN(8),
          value: 0.75,
        } as unknown as EditorEvent);

        const updated = view.automationLaneById.get("lane1")?.points[0]!;
        expect(Number(updated.time)).toBe(8);
        expect(updated.value).toBe(0.75);
      });

      it("automation.pointCurveChanged updates curve", () => {
        const point = { id: "pt1" as any, time: QN.QN(4), value: 0.5, curve: "linear" as const };
        const view = PV.fromProject(
          makeProject({
            automationLanes: [{ ...makeLane("lane1", "t1"), points: [point] }],
          }),
        );

        PV.applyEvent(view, {
          t: "automation.pointCurveChanged",
          laneId: "lane1",
          pointId: "pt1",
          curve: "expo",
        } as unknown as EditorEvent);

        expect(view.automationLaneById.get("lane1")?.points[0]?.curve).toBe("expo");
      });
    });

    // ----- Audio file events -----
    describe("audioFile events", () => {
      it("audioFile.registered adds file", () => {
        const view = PV.fromProject(makeProject());
        const audioFile = makeAudioFile("af1", "vocals.wav");

        PV.applyEvent(view, { t: "audioFile.registered", audioFile } as unknown as EditorEvent);

        expect(view.audioFileById.has("af1")).toBe(true);
      });

      it("audioFile.unregistered removes file", () => {
        const view = PV.fromProject(
          makeProject({
            audioFiles: [makeAudioFile("af1", "vocals.wav")],
          }),
        );

        PV.applyEvent(view, {
          t: "audioFile.unregistered",
          audioFileId: "af1",
        } as unknown as EditorEvent);

        expect(view.audioFileById.has("af1")).toBe(false);
      });

      it("audioFile.renamed updates name", () => {
        const view = PV.fromProject(
          makeProject({
            audioFiles: [makeAudioFile("af1", "old.wav")],
          }),
        );

        PV.applyEvent(view, {
          t: "audioFile.renamed",
          audioFileId: "af1",
          name: "new.wav",
        } as unknown as EditorEvent);

        expect(view.audioFileById.get("af1")?.name).toBe("new.wav");
      });
    });

    // ----- Consistency check -----
    describe("consistency", () => {
      it("applyEvent produces same entity maps as fromProject(evolve(...))", () => {
        const project = makeProject({
          tracks: [makeTrack("t1"), makeTrack("t2")],
          clips: [makeClip("c1", "t1", 0, 4)],
          midiPatterns: [makePattern("pat-c1", "Beat")],
        });

        const events: EditorEvent[] = [
          { t: "track.created", track: makeTrack("t3") } as unknown as EditorEvent,
          { t: "track.renamed", trackId: "t1", name: "Drums" } as unknown as EditorEvent,
          {
            t: "clip.created",
            clip: makeClip("c2", "t2", 8, 4),
            pattern: makePattern("pat-c2", "Bass"),
          } as unknown as EditorEvent,
          { t: "clip.moved", clipId: "c1", start: QN.QN(4) } as unknown as EditorEvent,
        ];

        // Build via incremental applyEvent
        const view = PV.fromProject(project);
        let evolved = project;
        for (const event of events) {
          PV.applyEvent(view, event);
          evolved = evolve(evolved, event);
        }

        // Build via full fromProject
        const expected = PV.fromProject(evolved);

        // Compare entity maps
        expect([...view.clipById.keys()].sort()).toEqual([...expected.clipById.keys()].sort());
        expect([...view.trackById.keys()].sort()).toEqual([...expected.trackById.keys()].sort());
        expect([...view.patternById.keys()].sort()).toEqual(
          [...expected.patternById.keys()].sort(),
        );
        expect(view.trackOrder).toEqual(expected.trackOrder);

        // Compare entity values
        for (const [id, clip] of view.clipById) {
          expect(clip.span.start).toBe(expected.clipById.get(id)!.span.start);
          expect(clip.trackId).toBe(expected.clipById.get(id)!.trackId);
        }
        for (const [id, track] of view.trackById) {
          expect(track.name).toBe(expected.trackById.get(id)!.name);
        }
      });
    });
  });
});
