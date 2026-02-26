// project-view.ts — Materialized entity maps + spatial index for O(1) lookups.
//
// ProjectView is built once from a Project via `fromProject`, then kept in sync
// incrementally via `applyEvent`. Rendering code uses entity maps for O(1) lookups
// and SpatialIndex for spatial clip queries, avoiding per-frame O(n) scans.

import type { AudioFile } from "./audio-file";
import type { AutomationLane } from "./automation";
import { type Clip, type ClipPayload, isMidiPayload, isAudioPayload } from "./clip";
import type { MidiPattern } from "./midi";
import type { Project } from "./project";
import type { Track } from "./track";
import type { EditorEvent } from "../events/editor";
import * as N from "../lib/numeric";
import * as QN from "../lib/qn";
import * as SI from "../lib/spatial-index";
import * as Ids from "../ids";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectView = {
  clipById: Map<string, Clip>;
  trackById: Map<string, Track>;
  patternById: Map<string, MidiPattern>;
  audioFileById: Map<string, AudioFile>;
  automationLaneById: Map<string, AutomationLane>;
  trackOrder: string[];
  trackIndex: Map<string, number>;
  clipIndex: SI.SpatialIndex<QN.QN, Ids.ClipId, Ids.TrackId>;
};

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

const DEFAULT_BUCKET_SIZE = 4;

/** Build a ProjectView from a Project. Iterates each array once. */
export function fromProject(project: Project, bucketSize = DEFAULT_BUCKET_SIZE): ProjectView {
  const clipById = new Map<string, Clip>();
  const trackById = new Map<string, Track>();
  const patternById = new Map<string, MidiPattern>();
  const audioFileById = new Map<string, AudioFile>();
  const automationLaneById = new Map<string, AutomationLane>();
  const trackOrder: string[] = [];
  const trackIndex = new Map<string, number>();

  for (let i = 0; i < project.tracks.length; i++) {
    const track = project.tracks[i]!;
    trackById.set(track.id, track);
    trackOrder.push(track.id);
    trackIndex.set(track.id, i);
  }

  for (const clip of project.clips) {
    clipById.set(clip.id, clip);
  }

  for (const pattern of project.midiPatterns) {
    patternById.set(pattern.id, pattern);
  }

  for (const audioFile of project.audioFiles) {
    audioFileById.set(audioFile.id, audioFile);
  }

  for (const lane of project.automationLanes) {
    automationLaneById.set(lane.id, lane);
  }

  const clipIndex = SI.make<QN.QN, Ids.ClipId, Ids.TrackId>(bucketSize);
  for (const clip of project.clips) {
    SI.add(clipIndex, clip.trackId, clip.id, clip.span);
  }

  return {
    clipById,
    trackById,
    patternById,
    audioFileById,
    automationLaneById,
    trackOrder,
    trackIndex,
    clipIndex,
  };
}

// ---------------------------------------------------------------------------
// Incremental updates
// ---------------------------------------------------------------------------

/** Rebuild trackOrder and trackIndex from current trackById (preserving order array). */
function rebuildTrackIndex(view: ProjectView): void {
  view.trackIndex.clear();
  for (let i = 0; i < view.trackOrder.length; i++) {
    view.trackIndex.set(view.trackOrder[i]!, i);
  }
}

/** Apply an EditorEvent to a ProjectView, mutating it in place. */
export function applyEvent(view: ProjectView, event: EditorEvent): void {
  switch (event.t) {
    // ----- Project -----
    case "project.created": {
      // Full rebuild from the new project
      const fresh = fromProject(event.project, view.clipIndex.bucketSize);
      view.clipById = fresh.clipById;
      view.trackById = fresh.trackById;
      view.patternById = fresh.patternById;
      view.audioFileById = fresh.audioFileById;
      view.automationLaneById = fresh.automationLaneById;
      view.trackOrder = fresh.trackOrder;
      view.trackIndex = fresh.trackIndex;
      view.clipIndex = fresh.clipIndex;
      break;
    }

    case "project.deleted":
    case "project.renamed":
    case "project.tempoChanged":
    case "project.timeSignatureChanged":
      // Metadata only — no view changes
      break;

    case "project.tracksReordered":
      view.trackOrder = event.trackIds.filter((id) => view.trackById.has(id));
      rebuildTrackIndex(view);
      break;

    // ----- Track -----
    case "track.created":
      view.trackById.set(event.track.id, event.track);
      view.trackOrder.push(event.track.id);
      view.trackIndex.set(event.track.id, view.trackOrder.length - 1);
      break;

    case "track.deleted": {
      view.trackById.delete(event.trackId);
      const idx = view.trackOrder.indexOf(event.trackId);
      if (idx !== -1) {
        view.trackOrder.splice(idx, 1);
        rebuildTrackIndex(view);
      }
      break;
    }

    case "track.renamed": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, name: event.name });
      break;
    }

    case "track.colorChanged": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, color: event.color });
      break;
    }

    case "track.volumeChanged": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, volumeDb: event.volumeDb });
      break;
    }

    case "track.panChanged": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, pan: event.pan });
      break;
    }

    case "track.muteChanged": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, mute: event.mute });
      break;
    }

    case "track.soloChanged": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, solo: event.solo });
      break;
    }

    case "track.compactChanged": {
      const track = view.trackById.get(event.trackId);
      if (track) view.trackById.set(event.trackId, { ...track, compact: event.compact });
      break;
    }

    case "track.heightMultiplierChanged": {
      const track = view.trackById.get(event.trackId);
      if (track)
        view.trackById.set(event.trackId, { ...track, heightMultiplier: event.heightMultiplier });
      break;
    }

    case "track.clipsReordered": {
      const orderMap = new Map<string, number>(event.clipIds.map((id, idx) => [id, idx] as const));
      for (const clipId of event.clipIds) {
        const clip = view.clipById.get(clipId);
        if (clip) {
          view.clipById.set(clipId, { ...clip, sortOrder: orderMap.get(clipId) ?? clip.sortOrder });
        }
      }
      break;
    }

    // ----- Clip -----
    case "clip.created":
      view.clipById.set(event.clip.id, event.clip);
      SI.add(view.clipIndex, event.clip.trackId, event.clip.id, event.clip.span);
      if (event.pattern) {
        view.patternById.set(event.pattern.id, event.pattern);
      }
      break;

    case "clip.deleted":
      view.clipById.delete(event.clipId);
      SI.remove(view.clipIndex, event.clipId);
      break;

    case "clip.moved": {
      const clip = view.clipById.get(event.clipId);
      if (clip) {
        view.clipById.set(event.clipId, {
          ...clip,
          span: { ...clip.span, start: event.start },
          ...(event.trackId !== undefined && { trackId: event.trackId }),
        });
        SI.move(view.clipIndex, event.clipId, event.start, event.trackId);
      }
      break;
    }

    case "clip.resized": {
      const clip = view.clipById.get(event.clipId);
      if (clip) {
        const startDelta = N.subtract(event.span.start, clip.span.start);
        const offsetQN = N.add(clip.offset, startDelta);
        view.clipById.set(event.clipId, { ...clip, span: event.span, offset: offsetQN });
        SI.resize(view.clipIndex, event.clipId, event.span);
      }
      break;
    }

    case "clip.loopSet": {
      const clip = view.clipById.get(event.clipId);
      if (clip) {
        const p = clip.payload;
        if (p.kind === "midi") {
          view.clipById.set(event.clipId, {
            ...clip,
            payload: { ...p, kind: "midi-loop", loop: event.loop },
          });
        } else if (p.kind === "audio") {
          view.clipById.set(event.clipId, {
            ...clip,
            payload: { ...p, kind: "audio-loop", loop: event.loop },
          });
        } else {
          // Already a loop variant — update loop region
          view.clipById.set(event.clipId, {
            ...clip,
            payload: { ...p, loop: event.loop },
          });
        }
      }
      break;
    }

    case "clip.loopRemoved": {
      const clip = view.clipById.get(event.clipId);
      if (clip) {
        const p = clip.payload;
        if (p.kind === "midi-loop") {
          const { loop: _, ...rest } = p;
          view.clipById.set(event.clipId, {
            ...clip,
            payload: { ...rest, kind: "midi" as const },
          });
        } else if (p.kind === "audio-loop") {
          const { loop: _, ...rest } = p;
          view.clipById.set(event.clipId, {
            ...clip,
            payload: { ...rest, kind: "audio" as const },
          });
        }
      }
      break;
    }

    // ----- MIDI -----
    case "midi.patternRenamed": {
      const pattern = view.patternById.get(event.patternId);
      if (pattern) {
        view.patternById.set(event.patternId, { ...pattern, name: event.name });
      }
      break;
    }

    case "midi.noteAdded": {
      const pattern = view.patternById.get(event.patternId);
      if (pattern) {
        view.patternById.set(event.patternId, {
          ...pattern,
          notes: [...pattern.notes, event.note],
        });
      }
      break;
    }

    case "midi.noteDeleted": {
      const pattern = view.patternById.get(event.patternId);
      if (pattern) {
        view.patternById.set(event.patternId, {
          ...pattern,
          notes: pattern.notes.filter((n) => n.id !== event.noteId),
        });
      }
      break;
    }

    case "midi.noteMoved": {
      const pattern = view.patternById.get(event.patternId);
      if (pattern) {
        view.patternById.set(event.patternId, {
          ...pattern,
          notes: pattern.notes.map((n) => (n.id === event.noteId ? { ...n, span: event.span } : n)),
        });
      }
      break;
    }

    case "midi.noteVelocityChanged": {
      const pattern = view.patternById.get(event.patternId);
      if (pattern) {
        view.patternById.set(event.patternId, {
          ...pattern,
          notes: pattern.notes.map((n) =>
            n.id === event.noteId ? { ...n, velocity: event.velocity } : n,
          ),
        });
      }
      break;
    }

    case "midi.notePitchChanged": {
      const pattern = view.patternById.get(event.patternId);
      if (pattern) {
        view.patternById.set(event.patternId, {
          ...pattern,
          notes: pattern.notes.map((n) =>
            n.id === event.noteId ? { ...n, pitch: event.pitch } : n,
          ),
        });
      }
      break;
    }

    // ----- Automation -----
    case "automation.laneCreated":
      view.automationLaneById.set(event.lane.id, event.lane);
      break;

    case "automation.laneDeleted":
      view.automationLaneById.delete(event.laneId);
      break;

    case "automation.pointAdded": {
      const lane = view.automationLaneById.get(event.laneId);
      if (lane) {
        view.automationLaneById.set(event.laneId, {
          ...lane,
          points: [...lane.points, event.point],
        });
      }
      break;
    }

    case "automation.pointDeleted": {
      const lane = view.automationLaneById.get(event.laneId);
      if (lane) {
        view.automationLaneById.set(event.laneId, {
          ...lane,
          points: lane.points.filter((p) => p.id !== event.pointId),
        });
      }
      break;
    }

    case "automation.pointMoved": {
      const lane = view.automationLaneById.get(event.laneId);
      if (lane) {
        view.automationLaneById.set(event.laneId, {
          ...lane,
          points: lane.points.map((p) =>
            p.id === event.pointId
              ? {
                  ...p,
                  ...(event.time !== undefined && { time: event.time }),
                  ...(event.value !== undefined && { value: event.value }),
                }
              : p,
          ),
        });
      }
      break;
    }

    case "automation.pointCurveChanged": {
      const lane = view.automationLaneById.get(event.laneId);
      if (lane) {
        view.automationLaneById.set(event.laneId, {
          ...lane,
          points: lane.points.map((p) =>
            p.id === event.pointId ? { ...p, curve: event.curve } : p,
          ),
        });
      }
      break;
    }

    // ----- Audio files -----
    case "audioFile.registered":
      view.audioFileById.set(event.audioFile.id, event.audioFile);
      break;

    case "audioFile.unregistered":
      view.audioFileById.delete(event.audioFileId);
      break;

    case "audioFile.renamed": {
      const file = view.audioFileById.get(event.audioFileId);
      if (file) {
        view.audioFileById.set(event.audioFileId, { ...file, name: event.name });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Resolve a clip's display title via O(1) map lookups. */
export function resolveClipTitle(payload: ClipPayload, view: ProjectView): string {
  if (isMidiPayload(payload)) {
    return view.patternById.get(payload.patternId)?.name ?? "Untitled";
  }
  if (isAudioPayload(payload)) {
    return view.audioFileById.get(payload.audioFileId)?.name ?? "Untitled";
  }
  return "Untitled";
}
