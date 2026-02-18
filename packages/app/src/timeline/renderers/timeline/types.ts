import type { Project } from "@daw/core/domain/project";
import type { ProjectView } from "@daw/core/lib/project-view";

export type { TrackColor } from "@daw/core/domain/track";

export type TimelineData = Readonly<{
  project: Project;
  view: ProjectView;
}>;

export type UIState = Readonly<{
  selectedClipId: string | null;
}>;

export type UIAction = Readonly<{ type: "select-clip"; clipId: string | null }>;
