// clip-projection.ts — Pixel-space rendering parameters for a clip viewport
import * as Crop from "./crop";

export type ClipProjection = {
  clipWidth: number;
  visibleLeft: number;
  visibleRight: number;
  visibleWidth: number;
};

export function make<A extends number>(
  crop: Crop.Crop<A>,
  pixelWidth: number,
  viewportLeft: number,
  viewportWidth: number,
): ClipProjection {
  const clipWidth = pixelWidth * Crop.scale(crop);
  const visibleLeft = viewportLeft + pixelWidth * Crop.ratio(crop);
  return {
    clipWidth,
    visibleLeft,
    visibleRight: visibleLeft + viewportWidth,
    visibleWidth: viewportWidth,
  };
}
