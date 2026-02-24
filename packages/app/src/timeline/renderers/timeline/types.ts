import type { Project } from "@daw/core/domain/project";
import type { ProjectView } from "@daw/core/domain/project-view";
import type { QN } from "@daw/core/lib/qn";
import type { Span } from "@daw/core/lib/span";

export type { TrackColor } from "@daw/core/domain/track";

export type TimelineData = Readonly<{
  project: Project;
  view: ProjectView;
}>;

export type UIState = Readonly<{
  selectedClipId: string | null;
}>;

export type UIAction =
  | Readonly<{ type: "select-clip"; clipId: string | null }>
  | Readonly<{ type: "commit-clip-move"; clipId: string; newStart: QN; newTrackId: string }>
  | Readonly<{ type: "commit-clip-resize"; clipId: string; span: Span<QN> }>;
