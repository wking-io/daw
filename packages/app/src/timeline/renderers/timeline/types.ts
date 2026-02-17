import type { Clip } from "@daw/core/domain/clip";
import type { Project } from "@daw/core/domain/project";

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

export type RulerSettings = Readonly<{
  minSpacing?: number;
  minLabelSpacing?: number;
  maxSubdivisions?: number;
}>;

export type TimelineData = Readonly<{
  project: Project;
  rulerSettings?: RulerSettings;
}>;

export function resolveClipTitle(clip: Clip, project: Project): string {
  const { payload } = clip;
  if (payload.kind === "midi") {
    return project.midiPatterns.find((p) => p.id === payload.patternId)?.name ?? "Untitled";
  }
  if (payload.kind === "audio") {
    return project.audioFiles.find((f) => f.id === payload.audioFileId)?.name ?? "Untitled";
  }
  return "Untitled";
}

export type UIState = Readonly<{
  selectedClipId: string | null;
}>;

export type UIAction = Readonly<{ type: "select-clip"; clipId: string | null }>;
