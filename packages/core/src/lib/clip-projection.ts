import * as Crop from "./crop";
import * as Projection from "./projection";
import * as Px from "./px";
import * as Span from "./span";
import * as Numeric from "./numeric";

/** Pixel-space rendering parameters for a clip viewport. */
export type ClipProjection = {
  /** Pixels per domain unit (e.g. pixels per quarter note). */
  scale: number;
  /**
   * The visible window into the clip's content, in pixels.
   * `view.start` is the pixel offset where the visible window begins within the content.
   * `view.size` is the on-screen pixel width of the visible portion.
   */
  view: Span.Span<Px.Px>;
  /** The total pixel width of the source content after crop scaling. */
  width: Px.Px;
};

export function make<A extends number>(
  crop: Crop.Crop<A>,
  width: Px.Px,
  view: Span.Span<Px.Px>,
): ClipProjection {
  const scaledWidth = Numeric.multiply(width, Crop.scale(crop));
  const visibleLeft = Numeric.multiply(Numeric.add(view.start, width), Crop.ratio(crop));
  return {
    scale: Projection.scaleFor(crop.source, scaledWidth),
    view: Span.make(visibleLeft, view.size),
    width: scaledWidth,
  };
}
