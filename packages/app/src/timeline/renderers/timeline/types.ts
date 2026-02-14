import type { QN } from "@daw/core/lib/qn";
import type { TimeSignature } from "@daw/core/lib/time-signature";

/** Color palette name for track coloring. Matches SurfaceColor palette names. */
export type TrackColor =
  | "plum"
  | "oatmeal"
  | "strawberry"
  | "ruby"
  | "tangerine"
  | "ochre"
  | "honey"
  | "lemon"
  | "pear"
  | "pistachio"
  | "jade"
  | "emerald"
  | "aqua"
  | "ocean"
  | "sky"
  | "cobalt"
  | "denim"
  | "iris"
  | "grape"
  | "lilac"
  | "fuchsia"
  | "blush"
  | "primary";

export type Clip = Readonly<{
  id: string;
  trackId: string;
  start: QN;
  end: QN;
  title: string;
}>;

export type Track = Readonly<{
  id: string;
  name: string;
  color: TrackColor;
}>;

export type RulerSettings = Readonly<{
  minSpacing?: number;
  minLabelSpacing?: number;
  maxSubdivisions?: number;
}>;

export type UIData = Readonly<{
  tracks: readonly Track[];
  clips: readonly Clip[];
  rulerSettings?: RulerSettings;
  timeSignature: TimeSignature;
}>;

export type UIState = Readonly<{
  selectedClipId: string | null;
}>;

export type UIAction = Readonly<{ type: "select-clip"; clipId: string | null }>;
