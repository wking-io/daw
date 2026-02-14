import * as Projection from "@daw/core/lib/projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Scroll from "@daw/core/lib/scroll";
import * as Timeline from "@daw/core/lib/timeline";
import { getPointerPosition } from "../utils/get-pointer-position";
import { TypedEventTarget } from "@remix-run/interaction";

export class ProjectionContext extends TypedEventTarget<{ change: Event }> {
  #containerWidth: Px.Px = Px.zero;
  #container: HTMLElement | null = null;
  #timeline: Timeline.Timeline<QN.QN>;

  constructor(timeline: Timeline.Timeline<QN.QN>) {
    super();
    this.#timeline = timeline;
  }

  get scale() {
    if (this.#containerWidth === 0) return 1;
    return Projection.scaleFor(QN.Numeric, this.#timeline.view.size, this.#containerWidth);
  }

  get contentWidth() {
    return Scroll.width(QN.Numeric, this.#timeline.size, this.scale);
  }

  get containerWidth() {
    return this.#containerWidth;
  }

  get timeline() {
    return this.#timeline;
  }

  get view() {
    return this.#timeline.view;
  }

  setContainerWidth(width: Px.Px) {
    if (this.#containerWidth === width) return;
    this.#containerWidth = width;
    this.dispatchEvent(new Event("change"));
  }

  setTimeline(timeline: Timeline.Timeline<QN.QN>) {
    if (this.#timeline === timeline) return;
    this.#timeline = timeline;
    this.dispatchEvent(new Event("change"));
  }

  setContainer(container: HTMLElement) {
    this.#container = container;
  }

  getPointerPosition(e: PointerEvent) {
    return getPointerPosition(e, this.#container);
  }

  contentToScreenX(x: QN.QN): Px.Px {
    return Projection.toScreen(QN.Numeric, this.#timeline.view.start, x, this.scale);
  }

  screenToContentX(x: Px.Px): QN.QN {
    return Projection.fromScreen(QN.Numeric, this.#timeline.view.start, x, this.scale);
  }
}
