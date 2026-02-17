import type { Project } from "@daw/core/domain/project";
import type { ProjectView } from "@daw/core/lib/project-view";

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

export type TimelineData = Readonly<{
  project: Project;
  view: ProjectView;
}>;

export type UIState = Readonly<{
  selectedClipId: string | null;
}>;

export type UIAction = Readonly<{ type: "select-clip"; clipId: string | null }>;
