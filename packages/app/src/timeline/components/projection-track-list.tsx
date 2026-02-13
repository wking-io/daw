import type { Handle } from "@remix-run/component";
import type { QN } from "@daw/core/lib/qn";
import * as Px from "@daw/core/lib/px";

import { ProjectionRoot } from "./projection-root";
import type { ProjectionRootContext } from "./projection-root";
import { Clip } from "./clip";
import type { DawAction, DawClip, DawData, DawUiState, TrackColor } from "../renderers/daw-skeleton/types";

const DEFAULT_TRACK_HEIGHT_PX = 28;
const CLIP_VERTICAL_PADDING = 3;

function computeTrackHeightPx(args: {
  trackCount: number;
  fitToHeight: boolean;
  canvasHeightPx: number;
}): number {
  const { trackCount, fitToHeight, canvasHeightPx } = args;
  if (!fitToHeight) return DEFAULT_TRACK_HEIGHT_PX;
  return canvasHeightPx / Math.max(1, trackCount);
}

type ClipLayout = {
  clip: DawClip;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  trackColor: TrackColor;
};

function computeClipLayouts(args: {
  data: DawData;
  ui: DawUiState;
  projection: { contentToScreenX: (x: QN) => Px.Px };
  trackHeightPx: number;
}): ClipLayout[] {
  const { data, ui, projection, trackHeightPx } = args;

  const trackById = new Map<string, { index: number; color: TrackColor }>();
  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i]!;
    trackById.set(track.id, { index: i, color: track.color });
  }

  const layouts: ClipLayout[] = [];

  for (const clip of data.clips) {
    const trackInfo = trackById.get(clip.trackId);
    if (trackInfo == null) continue;

    const leftPx = Number(projection.contentToScreenX(clip.start));
    const rightPx = Number(projection.contentToScreenX(clip.end));
    const widthPx = Math.max(1, rightPx - leftPx);

    const topPx = trackInfo.index * trackHeightPx + CLIP_VERTICAL_PADDING;
    const heightPx = Math.max(1, trackHeightPx - CLIP_VERTICAL_PADDING * 2);

    layouts.push({
      clip,
      x: leftPx,
      y: topPx,
      width: widthPx,
      height: heightPx,
      isSelected: ui.selectedClipId === clip.id,
      trackColor: trackInfo.color,
    });
  }

  return layouts;
}

export function ProjectionTrackList(handle: Handle) {
  const projCtx: ProjectionRootContext = handle.context.get(ProjectionRoot);

  return (props: {
    data: DawData;
    ui: DawUiState;
    dispatch: (action: DawAction) => void;
  }) => {
    const trackHeightPx = computeTrackHeightPx({
      trackCount: props.data.tracks.length,
      fitToHeight: true,
      canvasHeightPx: projCtx.height,
    });

    const clipLayouts = computeClipLayouts({
      data: props.data,
      ui: props.ui,
      projection: projCtx.projection,
      trackHeightPx,
    });

    const onBackgroundPointerDown = () => {
      props.dispatch({ type: "select-clip", clipId: null });
    };

    return (
      <div
        class="absolute inset-0 overflow-hidden pointer-events-auto"
        on={{ pointerdown: onBackgroundPointerDown }}
      >
        {clipLayouts.map((layout) => (
          <Clip
            key={layout.clip.id}
            setup={{ color: layout.trackColor }}
            clip={layout.clip}
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
            isSelected={layout.isSelected}
            dispatch={props.dispatch}
          />
        ))}
      </div>
    );
  };
}
