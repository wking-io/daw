/** Compute the slice of visible track IDs given vertical scroll state. */
export function visibleTrackSlice(
  trackIds: ReadonlyArray<string>,
  scrollTopPx: number,
  viewportHeightPx: number,
  rowHeightPx: number,
): string[] {
  if (rowHeightPx <= 0) return [];
  const row0 = Math.floor(scrollTopPx / rowHeightPx);
  const row1 = Math.ceil((scrollTopPx + viewportHeightPx) / rowHeightPx);
  return trackIds.slice(Math.max(0, row0), Math.min(trackIds.length, row1));
}
