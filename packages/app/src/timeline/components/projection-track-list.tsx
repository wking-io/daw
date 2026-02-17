import type { Handle } from "@remix-run/component";
import * as Bucket from "@daw/core/lib/bucket-index";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";

import { ProjectionRoot } from "./projection-root";
import { Clip, type ClipProps } from "./clip";
import { resolveClipTitle } from "@daw/core/lib/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "../renderers/timeline/types";
import type { ProjectionContext } from "../lib/projection-context";

const DEFAULT_TRACK_HEIGHT = Px.Px(28);
const CLIP_VERTICAL_PADDING = Px.Px(3);

function computeTrackHeight({
  trackCount,
  fitToHeight,
  canvasHeight,
}: {
  trackCount: number;
  fitToHeight: boolean;
  canvasHeight: Px.Px;
}): Px.Px {
  if (!fitToHeight) return DEFAULT_TRACK_HEIGHT;
  return Px.divide(canvasHeight, Math.max(1, trackCount));
}

type ClipData = Pick<ClipProps, "id" | "title" | "height" | "width" | "x" | "y" | "isSelected"> & {
  trackColor: TrackColor;
};

function computeClips({
  data,
  state,
  projection,
  trackHeight,
}: {
  data: TimelineData;
  state: UIState;
  projection: ProjectionContext;
  trackHeight: Px.Px;
}): ClipData[] {
  const { view } = data;
  const visibleClips = Bucket.queryTracks(view.clipIndex, view.trackOrder, projection.view);

  const clips: ClipData[] = [];
  for (const [trackId, clipIds] of visibleClips) {
    const track = view.trackById.get(trackId);
    const trackRow = view.trackIndex.get(trackId);
    if (!track || trackRow == null) continue;

    for (const clipId of clipIds) {
      const clip = view.clipById.get(clipId);
      if (!clip) continue;

      const clipEnd = Span.end(QN.Numeric, clip.span);
      const left = projection.contentToScreenX(clip.span.start);
      const right = projection.contentToScreenX(clipEnd);
      const width = Px.max(Px.Px(1), Px.subtract(right, left));

      const top = Px.multiply(Px.add(trackHeight, CLIP_VERTICAL_PADDING), trackRow);
      const height = Px.max(
        Px.Px(1),
        Px.subtract(trackHeight, Px.multiply(CLIP_VERTICAL_PADDING, 2)),
      );

      clips.push({
        id: clip.id,
        title: resolveClipTitle(clip, view),
        x: left,
        y: top,
        width,
        height,
        isSelected: state.selectedClipId === clip.id,
        trackColor: track.color as TrackColor,
      });
    }
  }
  return clips;
}

export function ProjectionTrackList(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);
  let containerHeight = Px.zero;

  handle.on(projection, { change: () => handle.update() });

  return ({
    data,
    state,
    dispatch,
  }: {
    data: TimelineData;
    state: UIState;
    dispatch: (action: UIAction) => void;
  }) => {
    const trackHeight = computeTrackHeight({
      trackCount: data.view.trackOrder.length,
      fitToHeight: true,
      canvasHeight: containerHeight,
    });

    const clips = computeClips({
      data,
      state,
      projection,
      trackHeight,
    });

    const onBackgroundPointerDown = () => {
      dispatch({ type: "select-clip", clipId: null });
    };

    return (
      <div
        class="absolute inset-0 overflow-hidden pointer-events-auto"
        connect={(node: HTMLElement, signal: AbortSignal) => {
          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
              const h = Px.Px(Math.round(entry.contentRect.height));
              if (h !== containerHeight) {
                containerHeight = h;
                handle.update();
              }
            }
          });
          observer.observe(node);
          signal.addEventListener("abort", () => observer.disconnect());
        }}
        on={{ pointerdown: onBackgroundPointerDown }}
      >
        {clips.map(({ trackColor, ...clip }) => (
          <Clip key={clip.id} setup={{ color: trackColor }} dispatch={dispatch} {...clip} />
        ))}
      </div>
    );
  };
}
