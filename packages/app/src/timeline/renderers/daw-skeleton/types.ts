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

export type DawClip = Readonly<{
  id: string;
  trackId: string;
  start: QN;
  end: QN;
  title: string;
}>;

export type DawTrack = Readonly<{
  id: string;
  name: string;
  color: TrackColor;
}>;

export type RulerSettings = Readonly<{
  minSpacingPx?: number;
  minLabelSpacingPx?: number;
  maxSubdivisions?: number;
}>;

export type DawData = Readonly<{
  tracks: readonly DawTrack[];
  clips: readonly DawClip[];
  timeSignature: TimeSignature;
  rulerSettings?: RulerSettings;
}>;

export type DawUiState = Readonly<{
  selectedClipId: string | null;
}>;

export type DawAction = Readonly<{ type: "select-clip"; clipId: string | null }>;
