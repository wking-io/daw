import type { Handle } from "@remix-run/component";
import * as Px from "@daw/core/lib/px";

import { ProjectionRoot } from "./projection-root";
import { Clip, type ClipProps } from "./clip";
import type { UIAction, UIData, UIState, TrackColor } from "../renderers/timeline/types";
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
  data: UIData;
  state: UIState;
  projection: ProjectionContext;
  trackHeight: Px.Px;
}): ClipData[] {
  const trackById = new Map<string, { index: number; color: TrackColor }>();
  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i]!;
    trackById.set(track.id, { index: i, color: track.color });
  }

  return data.clips.reduce<ClipData[]>((clips, clip) => {
    const trackInfo = trackById.get(clip.trackId);
    if (trackInfo == null) return clips;

    const left = projection.contentToScreenX(clip.start);
    const right = projection.contentToScreenX(clip.end);
    const width = Px.max(Px.Px(1), Px.subtract(right, left));

    const top = Px.multiply(Px.add(trackHeight, CLIP_VERTICAL_PADDING), trackInfo.index);
    const height = Px.max(
      Px.Px(1),
      Px.subtract(trackHeight, Px.multiply(CLIP_VERTICAL_PADDING, 2)),
    );

    return [
      ...clips,
      {
        id: clip.id,
        title: clip.title,
        x: left,
        y: top,
        width,
        height,
        isSelected: state.selectedClipId === clip.id,
        trackColor: trackInfo.color,
      },
    ];
  }, []);
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
    data: UIData;
    state: UIState;
    dispatch: (action: UIAction) => void;
  }) => {
    const trackHeight = computeTrackHeight({
      trackCount: data.tracks.length,
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
