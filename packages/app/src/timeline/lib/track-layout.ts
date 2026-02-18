import type { Track } from "@daw/core/domain/track";
import * as Px from "@daw/core/lib/px";

export const TITLE_BAR_HEIGHT = 22;
export const CONTENT_UNIT_HEIGHT = 22;
export const COMPACT_VERTICAL_PADDING = 1;
export const TRACK_LIST_VERTICAL_PADDING = 1;

export type TrackLayout = {
  trackId: string;
  y: Px.Px;
  height: Px.Px;
  titleBarHeight: Px.Px;
  contentHeight: Px.Px;
  compact: boolean;
};

export function buildTrackLayouts(
  trackOrder: readonly string[],
  trackById: Map<string, Track>,
): Map<string, TrackLayout> {
  const layouts = new Map<string, TrackLayout>();
  let cumulativeY = TRACK_LIST_VERTICAL_PADDING;

  for (const trackId of trackOrder) {
    const track = trackById.get(trackId);
    if (!track) continue;

    const contentHeight = track.compact ? 0 : track.heightMultiplier * CONTENT_UNIT_HEIGHT;
    const totalHeight = track.compact
      ? TITLE_BAR_HEIGHT + COMPACT_VERTICAL_PADDING * 2
      : TITLE_BAR_HEIGHT + contentHeight;

    layouts.set(trackId, {
      trackId,
      y: Px.Px(cumulativeY),
      height: Px.Px(totalHeight),
      titleBarHeight: Px.Px(TITLE_BAR_HEIGHT),
      contentHeight: Px.Px(contentHeight),
      compact: track.compact,
    });

    cumulativeY += totalHeight;
  }

  return layouts;
}
