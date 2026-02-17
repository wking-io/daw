import type { Project } from "@daw/core/domain/project";
import { generate } from "@daw/core/ids";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as TimeSignature from "@daw/core/lib/time-signature";
import { ProjectVersion } from "@daw/core/versions";
import { Option } from "effect";

const projectId = generate("ProjectId");

// Track IDs
const t1 = generate("TrackId");
const t2 = generate("TrackId");
const t3 = generate("TrackId");
const t4 = generate("TrackId");
const t5 = generate("TrackId");
const t6 = generate("TrackId");
const t7 = generate("TrackId");
const t8 = generate("TrackId");

// Pattern IDs (one per clip for title lookup)
const p1 = generate("PatternId");
const p2 = generate("PatternId");
const p3 = generate("PatternId");
const p4 = generate("PatternId");
const p5 = generate("PatternId");
const p6 = generate("PatternId");
const p7 = generate("PatternId");
const p8 = generate("PatternId");
const p9 = generate("PatternId");
const p10 = generate("PatternId");
const p11 = generate("PatternId");
const p12 = generate("PatternId");
const p13 = generate("PatternId");
const p14 = generate("PatternId");
const p15 = generate("PatternId");

const qnSpan = (start: number, end: number) => Span.make(QN.Numeric, start, end - start);

export const demoProject: Project = {
  id: projectId,
  name: "Demo Project",
  version: ProjectVersion.make(0),
  bpm: 120,
  timeSignature: TimeSignature.common,
  tracks: [
    { id: t1, projectId, type: "midi", name: "Drums", color: "tangerine", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 0, deviceIds: [] },
    { id: t2, projectId, type: "midi", name: "Bass", color: "grape", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 1, deviceIds: [] },
    { id: t3, projectId, type: "midi", name: "Keys", color: "aqua", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 2, deviceIds: [] },
    { id: t4, projectId, type: "midi", name: "Vox", color: "fuchsia", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 3, deviceIds: [] },
    { id: t5, projectId, type: "midi", name: "FX", color: "emerald", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 4, deviceIds: [] },
    { id: t6, projectId, type: "midi", name: "Pads", color: "denim", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 5, deviceIds: [] },
    { id: t7, projectId, type: "midi", name: "Lead", color: "honey", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 6, deviceIds: [] },
    { id: t8, projectId, type: "midi", name: "Perc", color: "strawberry", volumeDb: 0, pan: 0, mute: false, solo: false, sortOrder: 7, deviceIds: [] },
  ],
  clips: [
    // Drums (t1)
    { id: generate("ClipId"), projectId, trackId: t1, span: qnSpan(32, 64), loop: { enabled: false, length: QN.QN(32) }, sortOrder: 0, payload: { kind: "midi", patternId: p1 } },
    { id: generate("ClipId"), projectId, trackId: t1, span: qnSpan(68, 100), loop: { enabled: false, length: QN.QN(32) }, sortOrder: 1, payload: { kind: "midi", patternId: p2 } },
    // Bass (t2)
    { id: generate("ClipId"), projectId, trackId: t2, span: qnSpan(40, 112), loop: { enabled: false, length: QN.QN(72) }, sortOrder: 0, payload: { kind: "midi", patternId: p3 } },
    // Keys (t3)
    { id: generate("ClipId"), projectId, trackId: t3, span: qnSpan(48, 80), loop: { enabled: false, length: QN.QN(32) }, sortOrder: 0, payload: { kind: "midi", patternId: p4 } },
    { id: generate("ClipId"), projectId, trackId: t3, span: qnSpan(88, 116), loop: { enabled: false, length: QN.QN(28) }, sortOrder: 1, payload: { kind: "midi", patternId: p5 } },
    // Vox (t4)
    { id: generate("ClipId"), projectId, trackId: t4, span: qnSpan(84, 108), loop: { enabled: false, length: QN.QN(24) }, sortOrder: 0, payload: { kind: "midi", patternId: p6 } },
    { id: generate("ClipId"), projectId, trackId: t4, span: qnSpan(112, 140), loop: { enabled: false, length: QN.QN(28) }, sortOrder: 1, payload: { kind: "midi", patternId: p7 } },
    // FX (t5)
    { id: generate("ClipId"), projectId, trackId: t5, span: qnSpan(28, 44), loop: { enabled: false, length: QN.QN(16) }, sortOrder: 0, payload: { kind: "midi", patternId: p8 } },
    { id: generate("ClipId"), projectId, trackId: t5, span: qnSpan(76, 88), loop: { enabled: false, length: QN.QN(12) }, sortOrder: 1, payload: { kind: "midi", patternId: p9 } },
    // Pads (t6)
    { id: generate("ClipId"), projectId, trackId: t6, span: qnSpan(36, 100), loop: { enabled: false, length: QN.QN(64) }, sortOrder: 0, payload: { kind: "midi", patternId: p10 } },
    // Lead (t7)
    { id: generate("ClipId"), projectId, trackId: t7, span: qnSpan(64, 80), loop: { enabled: false, length: QN.QN(16) }, sortOrder: 0, payload: { kind: "midi", patternId: p11 } },
    { id: generate("ClipId"), projectId, trackId: t7, span: qnSpan(96, 120), loop: { enabled: false, length: QN.QN(24) }, sortOrder: 1, payload: { kind: "midi", patternId: p12 } },
    // Perc (t8)
    { id: generate("ClipId"), projectId, trackId: t8, span: qnSpan(32, 52), loop: { enabled: false, length: QN.QN(20) }, sortOrder: 0, payload: { kind: "midi", patternId: p13 } },
    { id: generate("ClipId"), projectId, trackId: t8, span: qnSpan(56, 72), loop: { enabled: false, length: QN.QN(16) }, sortOrder: 1, payload: { kind: "midi", patternId: p14 } },
    { id: generate("ClipId"), projectId, trackId: t8, span: qnSpan(80, 108), loop: { enabled: false, length: QN.QN(28) }, sortOrder: 2, payload: { kind: "midi", patternId: p15 } },
  ],
  midiPatterns: [
    { id: p1, projectId, name: "Beat A", notes: [] },
    { id: p2, projectId, name: "Beat B", notes: [] },
    { id: p3, projectId, name: "Bassline", notes: [] },
    { id: p4, projectId, name: "Chords", notes: [] },
    { id: p5, projectId, name: "Bridge", notes: [] },
    { id: p6, projectId, name: "Verse", notes: [] },
    { id: p7, projectId, name: "Chorus", notes: [] },
    { id: p8, projectId, name: "Riser", notes: [] },
    { id: p9, projectId, name: "Impact", notes: [] },
    { id: p10, projectId, name: "Atmosphere", notes: [] },
    { id: p11, projectId, name: "Hook", notes: [] },
    { id: p12, projectId, name: "Solo", notes: [] },
    { id: p13, projectId, name: "Shaker", notes: [] },
    { id: p14, projectId, name: "Tamb", notes: [] },
    { id: p15, projectId, name: "Congas", notes: [] },
  ],
  automationLanes: [],
  audioFiles: [],
  deletedAt: Option.none(),
};
