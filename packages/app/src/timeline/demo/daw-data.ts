import type { Project } from "@daw/core/domain/project";
import { generate } from "@daw/core/ids";
import * as QN from "@daw/core/lib/qn";
import * as Sec from "@daw/core/lib/sec";
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
const t9 = generate("TrackId");
const t10 = generate("TrackId");
const t11 = generate("TrackId");
const t12 = generate("TrackId");
const t13 = generate("TrackId");

// Audio file IDs
const af1 = generate("AudioFileId");
const af2 = generate("AudioFileId");
const af3 = generate("AudioFileId");
const af4 = generate("AudioFileId");
const af5 = generate("AudioFileId");
const af6 = generate("AudioFileId");
const af7 = generate("AudioFileId");
const af8 = generate("AudioFileId");
const af9 = generate("AudioFileId");
const af10 = generate("AudioFileId");

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

// Helper to create a MIDI note (positions relative to pattern start)
const n = (pitch: number, start: number, size: number, velocity = 100) => ({
  id: generate("NoteId"),
  pitch,
  velocity,
  span: Span.make(QN.QN(start), QN.QN(size)),
});

// Beat A (Drums, 32 QN): Kick(36) every 4 QN, Snare(38) at offbeat, HiHat(42) every 2 QN
const beatANotes = [
  // Kick
  ...Array.from({ length: 8 }, (_, i) => n(36, i * 4, 1)),
  // Snare
  ...[2, 6, 10, 14, 18, 22, 26, 30].map((s) => n(38, s, 1)),
  // HiHat
  ...Array.from({ length: 16 }, (_, i) => n(42, i * 2, 0.5)),
];

// Beat B (Drums, 32 QN): variation with open hats and syncopation
const beatBNotes = [
  ...Array.from({ length: 8 }, (_, i) => n(36, i * 4, 1)),
  ...[4, 12, 20, 28].map((s) => n(38, s, 1)),
  ...Array.from({ length: 16 }, (_, i) => n(42, i * 2, 0.5)),
  ...[3, 7, 11, 15, 19, 23, 27, 31].map((s) => n(46, s, 0.5, 80)),
];

// Bassline (72 QN): root notes with rhythmic variation
const basslineNotes = [
  n(36, 0, 2),
  n(36, 4, 1),
  n(36, 6, 2),
  n(38, 8, 2),
  n(36, 12, 1),
  n(36, 14, 2),
  n(41, 16, 2),
  n(41, 20, 1),
  n(41, 22, 2),
  n(43, 24, 4),
  n(36, 28, 2),
  n(36, 32, 2),
  n(38, 36, 1),
  n(38, 38, 2),
  n(41, 40, 2),
  n(41, 44, 1),
  n(43, 46, 2),
  n(43, 48, 4),
  n(36, 52, 2),
  n(36, 56, 2),
  n(38, 60, 1),
  n(38, 62, 2),
  n(41, 64, 4),
  n(43, 68, 4),
];

// Chords (Keys, 32 QN): triads held for 4 QN blocks
const chordNotes = [
  // C major (C4, E4, G4)
  n(60, 0, 4),
  n(64, 0, 4),
  n(67, 0, 4),
  n(60, 4, 4),
  n(64, 4, 4),
  n(67, 4, 4),
  // A minor (A3, C4, E4)
  n(57, 8, 4),
  n(60, 8, 4),
  n(64, 8, 4),
  n(57, 12, 4),
  n(60, 12, 4),
  n(64, 12, 4),
  // F major (F3, A3, C4)
  n(53, 16, 4),
  n(57, 16, 4),
  n(60, 16, 4),
  n(53, 20, 4),
  n(57, 20, 4),
  n(60, 20, 4),
  // G major (G3, B3, D4)
  n(55, 24, 4),
  n(59, 24, 4),
  n(62, 24, 4),
  n(55, 28, 4),
  n(59, 28, 4),
  n(62, 28, 4),
];

// Bridge (Keys, 28 QN): arpeggiated chords
const bridgeNotes = [
  n(60, 0, 1),
  n(64, 1, 1),
  n(67, 2, 1),
  n(72, 3, 1),
  n(57, 4, 1),
  n(60, 5, 1),
  n(64, 6, 1),
  n(69, 7, 1),
  n(53, 8, 1),
  n(57, 9, 1),
  n(60, 10, 1),
  n(65, 11, 1),
  n(55, 12, 1),
  n(59, 13, 1),
  n(62, 14, 1),
  n(67, 15, 1),
  n(60, 16, 1),
  n(64, 17, 1),
  n(67, 18, 1),
  n(72, 19, 1),
  n(57, 20, 1),
  n(60, 21, 1),
  n(64, 22, 1),
  n(69, 23, 1),
  n(55, 24, 2),
  n(59, 24, 2),
  n(62, 24, 2),
  n(67, 24, 2),
];

// Verse (Vox, 24 QN): melodic phrase
const verseNotes = [
  n(72, 0, 2),
  n(74, 2, 1),
  n(76, 3, 2),
  n(74, 6, 1),
  n(72, 8, 2),
  n(69, 10, 2),
  n(67, 12, 4),
  n(69, 16, 2),
  n(72, 18, 1),
  n(74, 20, 2),
  n(72, 22, 2),
];

// Chorus (Vox, 28 QN): bigger melodic phrase
const chorusNotes = [
  n(76, 0, 2),
  n(79, 2, 2),
  n(81, 4, 4),
  n(79, 8, 2),
  n(76, 10, 2),
  n(74, 12, 4),
  n(76, 16, 2),
  n(79, 18, 2),
  n(81, 20, 2),
  n(84, 22, 2),
  n(81, 24, 4),
];

// Riser (FX, 16 QN): ascending notes
const riserNotes = Array.from({ length: 16 }, (_, i) => n(48 + i * 2, i, 1, 60 + i * 4));

// Impact (FX, 12 QN): crash
const impactNotes = [n(36, 0, 8, 127), n(48, 0, 6, 100), n(60, 0, 4, 80)];

// Atmosphere (Pads, 64 QN): long sustained chords
const atmosphereNotes = [
  n(48, 0, 16),
  n(55, 0, 16),
  n(60, 0, 16),
  n(48, 16, 16),
  n(53, 16, 16),
  n(57, 16, 16),
  n(48, 32, 16),
  n(55, 32, 16),
  n(60, 32, 16),
  n(48, 48, 16),
  n(53, 48, 16),
  n(57, 48, 16),
];

// Hook (Lead, 16 QN): catchy melodic line
const hookNotes = [
  n(76, 0, 1),
  n(79, 1, 0.5),
  n(81, 1.5, 1),
  n(84, 2.5, 0.5),
  n(81, 3, 1),
  n(79, 4, 2),
  n(76, 6, 1),
  n(74, 7, 1),
  n(76, 8, 1),
  n(79, 9, 0.5),
  n(81, 9.5, 1),
  n(84, 10.5, 0.5),
  n(86, 11, 1),
  n(84, 12, 2),
  n(81, 14, 2),
];

// Solo (Lead, 24 QN): fast melodic run
const soloNotes = [
  n(72, 0, 0.5),
  n(74, 0.5, 0.5),
  n(76, 1, 0.5),
  n(79, 1.5, 0.5),
  n(81, 2, 1),
  n(84, 3, 0.5),
  n(81, 3.5, 0.5),
  n(79, 4, 1),
  n(76, 5, 0.5),
  n(74, 5.5, 0.5),
  n(72, 6, 2),
  n(74, 8, 0.5),
  n(76, 8.5, 0.5),
  n(79, 9, 0.5),
  n(81, 9.5, 0.5),
  n(84, 10, 1),
  n(86, 11, 1),
  n(84, 12, 2),
  n(81, 14, 0.5),
  n(79, 14.5, 0.5),
  n(76, 15, 1),
  n(74, 16, 2),
  n(76, 18, 1),
  n(79, 19, 1),
  n(81, 20, 2),
  n(84, 22, 2),
];

// Shaker (Perc, 20 QN): 16th-note shaker pattern
const shakerNotes = Array.from({ length: 20 }, (_, i) => n(69, i, 0.5, 60 + (i % 2) * 30));

// Tamb (Perc, 16 QN): tambourine on offbeats
const tambNotes = Array.from({ length: 8 }, (_, i) => n(54, i * 2 + 1, 0.5, 90));

// Congas (Perc, 28 QN): syncopated conga pattern
const congaNotes = [
  n(63, 0, 1),
  n(64, 1.5, 0.5),
  n(63, 2, 1),
  n(60, 3.5, 0.5),
  n(63, 4, 1),
  n(64, 5.5, 0.5),
  n(63, 6, 1),
  n(60, 7.5, 0.5),
  n(63, 8, 1),
  n(64, 9.5, 0.5),
  n(63, 10, 1),
  n(60, 11.5, 0.5),
  n(63, 12, 1),
  n(64, 13.5, 0.5),
  n(63, 14, 1),
  n(60, 15.5, 0.5),
  n(63, 16, 1),
  n(64, 17.5, 0.5),
  n(63, 18, 1),
  n(60, 19.5, 0.5),
  n(63, 20, 1),
  n(64, 21.5, 0.5),
  n(63, 22, 1),
  n(60, 23.5, 0.5),
  n(63, 24, 1),
  n(64, 25.5, 0.5),
  n(63, 26, 1),
  n(60, 27.5, 0.5),
];

export const demoProject: Project = {
  id: projectId,
  name: "Demo Project",
  version: ProjectVersion.make(0),
  bpm: 120,
  timeSignature: TimeSignature.common,
  tracks: [
    {
      id: t1,
      projectId,
      type: "midi",
      name: "Drums",
      color: "tangerine",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 0,
      deviceIds: [],
    },
    {
      id: t10,
      projectId,
      type: "audio",
      name: "Guitar",
      color: "ochre",
      volumeDb: 0,
      pan: -0.2,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 1,
      deviceIds: [],
    },
    {
      id: t2,
      projectId,
      type: "midi",
      name: "Bass",
      color: "grape",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 2,
      deviceIds: [],
    },
    {
      id: t3,
      projectId,
      type: "midi",
      name: "Keys",
      color: "aqua",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 3,
      deviceIds: [],
    },
    {
      id: t11,
      projectId,
      type: "audio",
      name: "Vocals",
      color: "lilac",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 4,
      deviceIds: [],
    },
    {
      id: t4,
      projectId,
      type: "midi",
      name: "Vox",
      color: "fuchsia",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 5,
      deviceIds: [],
    },
    {
      id: t5,
      projectId,
      type: "midi",
      name: "FX",
      color: "emerald",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: true,
      heightMultiplier: 2,
      sortOrder: 6,
      deviceIds: [],
    },
    {
      id: t12,
      projectId,
      type: "audio",
      name: "Ambient",
      color: "cobalt",
      volumeDb: -3,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 7,
      deviceIds: [],
    },
    {
      id: t6,
      projectId,
      type: "midi",
      name: "Pads",
      color: "denim",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 8,
      deviceIds: [],
    },
    {
      id: t7,
      projectId,
      type: "midi",
      name: "Lead",
      color: "honey",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 9,
      deviceIds: [],
    },
    {
      id: t13,
      projectId,
      type: "audio",
      name: "Synth Pad",
      color: "blush",
      volumeDb: 0,
      pan: 0.15,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 10,
      deviceIds: [],
    },
    {
      id: t8,
      projectId,
      type: "midi",
      name: "Perc",
      color: "strawberry",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 11,
      deviceIds: [],
    },
    {
      id: t9,
      projectId,
      type: "audio",
      name: "Samples",
      color: "ocean",
      volumeDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      compact: false,
      heightMultiplier: 2,
      sortOrder: 12,
      deviceIds: [],
    },
  ],
  clips: [
    // Drums (t1)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t1,
      span: Span.make(QN.QN(32), QN.QN(32)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p1, length: QN.QN(32) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t1,
      span: Span.make(QN.QN(68), QN.QN(32)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p2, length: QN.QN(32) },
    },
    // Bass (t2)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t2,
      span: Span.make(QN.QN(40), QN.QN(72)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p3, length: QN.QN(72) },
    },
    // Keys (t3)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t3,
      span: Span.make(QN.QN(48), QN.QN(32)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p4, length: QN.QN(32) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t3,
      span: Span.make(QN.QN(88), QN.QN(28)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p5, length: QN.QN(28) },
    },
    // Vox (t4)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t4,
      span: Span.make(QN.QN(84), QN.QN(24)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p6, length: QN.QN(24) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t4,
      span: Span.make(QN.QN(112), QN.QN(28)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p7, length: QN.QN(28) },
    },
    // FX (t5)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t5,
      span: Span.make(QN.QN(28), QN.QN(16)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p8, length: QN.QN(16) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t5,
      span: Span.make(QN.QN(76), QN.QN(12)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p9, length: QN.QN(12) },
    },
    // Pads (t6)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t6,
      span: Span.make(QN.QN(36), QN.QN(64)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p10, length: QN.QN(64) },
    },
    // Lead (t7)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t7,
      span: Span.make(QN.QN(64), QN.QN(16)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p11, length: QN.QN(16) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t7,
      span: Span.make(QN.QN(96), QN.QN(24)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p12, length: QN.QN(24) },
    },
    // Perc (t8)
    {
      id: generate("ClipId"),
      projectId,
      trackId: t8,
      span: Span.make(QN.QN(32), QN.QN(20)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p13, length: QN.QN(20) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t8,
      span: Span.make(QN.QN(56), QN.QN(16)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p14, length: QN.QN(16) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t8,
      span: Span.make(QN.QN(80), QN.QN(28)),

      sortOrder: 2,
      offset: QN.zero,
      payload: { kind: "midi", patternId: p15, length: QN.QN(28) },
    },
    // Samples (t9) — audio clips
    {
      id: generate("ClipId"),
      projectId,
      trackId: t9,
      span: Span.make(QN.QN(32), QN.QN(32)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af1, offset: Sec.zero, length: QN.QN(32) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t9,
      span: Span.make(QN.QN(72), QN.QN(24)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af2, offset: Sec.zero, length: QN.QN(24) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t9,
      span: Span.make(QN.QN(100), QN.QN(32)),

      sortOrder: 2,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af3, offset: Sec.Sec(2.5), length: QN.QN(32) },
    },
    // Guitar (t10) — audio clips
    {
      id: generate("ClipId"),
      projectId,
      trackId: t10,
      span: Span.make(QN.QN(40), QN.QN(32)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af4, offset: Sec.zero, length: QN.QN(32) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t10,
      span: Span.make(QN.QN(80), QN.QN(32)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af5, offset: Sec.zero, length: QN.QN(32) },
    },
    // Vocals (t11) — audio clips
    {
      id: generate("ClipId"),
      projectId,
      trackId: t11,
      span: Span.make(QN.QN(48), QN.QN(40)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af6, offset: Sec.zero, length: QN.QN(40) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t11,
      span: Span.make(QN.QN(96), QN.QN(28)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af7, offset: Sec.Sec(1.2), length: QN.QN(28) },
    },
    // Ambient (t12) — audio clips
    {
      id: generate("ClipId"),
      projectId,
      trackId: t12,
      span: Span.make(QN.QN(0), QN.QN(48)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af8, offset: Sec.zero, length: QN.QN(48) },
    },
    {
      id: generate("ClipId"),
      projectId,
      trackId: t12,
      span: Span.make(QN.QN(56), QN.QN(44)),

      sortOrder: 1,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af9, offset: Sec.zero, length: QN.QN(44) },
    },
    // Synth Pad (t13) — audio clips
    {
      id: generate("ClipId"),
      projectId,
      trackId: t13,
      span: Span.make(QN.QN(32), QN.QN(48)),

      sortOrder: 0,
      offset: QN.zero,
      payload: { kind: "audio", audioFileId: af10, offset: Sec.zero, length: QN.QN(48) },
    },
  ],
  midiPatterns: [
    { id: p1, projectId, name: "Beat A", notes: beatANotes },
    { id: p2, projectId, name: "Beat B", notes: beatBNotes },
    { id: p3, projectId, name: "Bassline", notes: basslineNotes },
    { id: p4, projectId, name: "Chords", notes: chordNotes },
    { id: p5, projectId, name: "Bridge", notes: bridgeNotes },
    { id: p6, projectId, name: "Verse", notes: verseNotes },
    { id: p7, projectId, name: "Chorus", notes: chorusNotes },
    { id: p8, projectId, name: "Riser", notes: riserNotes },
    { id: p9, projectId, name: "Impact", notes: impactNotes },
    { id: p10, projectId, name: "Atmosphere", notes: atmosphereNotes },
    { id: p11, projectId, name: "Hook", notes: hookNotes },
    { id: p12, projectId, name: "Solo", notes: soloNotes },
    { id: p13, projectId, name: "Shaker", notes: shakerNotes },
    { id: p14, projectId, name: "Tamb", notes: tambNotes },
    { id: p15, projectId, name: "Congas", notes: congaNotes },
  ],
  automationLanes: [],
  audioFiles: [
    {
      id: af1,
      projectId,
      name: "Guitar Loop",
      originalPath: "/samples/guitar-loop.wav",
      storedPath: "/project/audio/guitar-loop.wav",
      duration: Sec.Sec(16),
      sampleRate: 44100,
      channels: 2,
    },
    {
      id: af2,
      projectId,
      name: "Vocal Chop",
      originalPath: "/samples/vocal-chop.wav",
      storedPath: "/project/audio/vocal-chop.wav",
      duration: Sec.Sec(12),
      sampleRate: 44100,
      channels: 1,
    },
    {
      id: af3,
      projectId,
      name: "String Section",
      originalPath: "/samples/strings.wav",
      storedPath: "/project/audio/strings.wav",
      duration: Sec.Sec(20),
      sampleRate: 48000,
      channels: 2,
    },
    {
      id: af4,
      projectId,
      name: "Acoustic Strum",
      originalPath: "/samples/acoustic-strum.wav",
      storedPath: "/project/audio/acoustic-strum.wav",
      duration: Sec.Sec(16),
      sampleRate: 44100,
      channels: 2,
    },
    {
      id: af5,
      projectId,
      name: "Electric Riff",
      originalPath: "/samples/electric-riff.wav",
      storedPath: "/project/audio/electric-riff.wav",
      duration: Sec.Sec(16),
      sampleRate: 44100,
      channels: 2,
    },
    {
      id: af6,
      projectId,
      name: "Vocal Take",
      originalPath: "/samples/vocal-take.wav",
      storedPath: "/project/audio/vocal-take.wav",
      duration: Sec.Sec(20),
      sampleRate: 48000,
      channels: 1,
    },
    {
      id: af7,
      projectId,
      name: "Ad Libs",
      originalPath: "/samples/ad-libs.wav",
      storedPath: "/project/audio/ad-libs.wav",
      duration: Sec.Sec(14),
      sampleRate: 48000,
      channels: 1,
    },
    {
      id: af8,
      projectId,
      name: "Rain Texture",
      originalPath: "/samples/rain-texture.wav",
      storedPath: "/project/audio/rain-texture.wav",
      duration: Sec.Sec(24),
      sampleRate: 44100,
      channels: 2,
    },
    {
      id: af9,
      projectId,
      name: "Tape Hiss",
      originalPath: "/samples/tape-hiss.wav",
      storedPath: "/project/audio/tape-hiss.wav",
      duration: Sec.Sec(22),
      sampleRate: 44100,
      channels: 1,
    },
    {
      id: af10,
      projectId,
      name: "Warm Pad",
      originalPath: "/samples/warm-pad.wav",
      storedPath: "/project/audio/warm-pad.wav",
      duration: Sec.Sec(24),
      sampleRate: 48000,
      channels: 2,
    },
  ],
  deletedAt: Option.none(),
};
