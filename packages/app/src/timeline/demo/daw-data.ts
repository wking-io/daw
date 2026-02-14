import * as QN from "@daw/core/lib/qn";
import * as TimeSignature from "@daw/core/lib/time-signature";
import type { UIData } from "../renderers/timeline/types";

export const demoDawData: UIData = {
  timeSignature: TimeSignature.common,
  tracks: [
    { id: "t1", name: "Drums", color: "tangerine" },
    { id: "t2", name: "Bass", color: "grape" },
    { id: "t3", name: "Keys", color: "aqua" },
    { id: "t4", name: "Vox", color: "fuchsia" },
    { id: "t5", name: "FX", color: "emerald" },
    { id: "t6", name: "Pads", color: "denim" },
    { id: "t7", name: "Lead", color: "honey" },
    { id: "t8", name: "Perc", color: "strawberry" },
  ],
  clips: [
    // Drums (t1)
    {
      id: "c1",
      trackId: "t1",
      start: QN.QN(32),
      end: QN.QN(64),
      title: "Beat A",
    },
    {
      id: "c2",
      trackId: "t1",
      start: QN.QN(68),
      end: QN.QN(100),
      title: "Beat B",
    },
    // Bass (t2)
    {
      id: "c3",
      trackId: "t2",
      start: QN.QN(40),
      end: QN.QN(112),
      title: "Bassline",
    },
    // Keys (t3)
    {
      id: "c4",
      trackId: "t3",
      start: QN.QN(48),
      end: QN.QN(80),
      title: "Chords",
    },
    {
      id: "c5",
      trackId: "t3",
      start: QN.QN(88),
      end: QN.QN(116),
      title: "Bridge",
    },
    // Vox (t4)
    {
      id: "c6",
      trackId: "t4",
      start: QN.QN(84),
      end: QN.QN(108),
      title: "Verse",
    },
    {
      id: "c7",
      trackId: "t4",
      start: QN.QN(112),
      end: QN.QN(140),
      title: "Chorus",
    },
    // FX (t5)
    {
      id: "c8",
      trackId: "t5",
      start: QN.QN(28),
      end: QN.QN(44),
      title: "Riser",
    },
    {
      id: "c9",
      trackId: "t5",
      start: QN.QN(76),
      end: QN.QN(88),
      title: "Impact",
    },
    // Pads (t6)
    {
      id: "c10",
      trackId: "t6",
      start: QN.QN(36),
      end: QN.QN(100),
      title: "Atmosphere",
    },
    // Lead (t7)
    {
      id: "c11",
      trackId: "t7",
      start: QN.QN(64),
      end: QN.QN(80),
      title: "Hook",
    },
    {
      id: "c12",
      trackId: "t7",
      start: QN.QN(96),
      end: QN.QN(120),
      title: "Solo",
    },
    // Perc (t8)
    {
      id: "c13",
      trackId: "t8",
      start: QN.QN(32),
      end: QN.QN(52),
      title: "Shaker",
    },
    {
      id: "c14",
      trackId: "t8",
      start: QN.QN(56),
      end: QN.QN(72),
      title: "Tamb",
    },
    {
      id: "c15",
      trackId: "t8",
      start: QN.QN(80),
      end: QN.QN(108),
      title: "Congas",
    },
  ],
};
