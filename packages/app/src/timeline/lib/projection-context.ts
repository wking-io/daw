import * as Projection from "@daw/core/lib/projection";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Scroll from "@daw/core/lib/scroll";
import * as Timeline from "@daw/core/lib/timeline";
import { getPointerPosition } from "../utils/get-pointer-position";
import { TypedEventTarget } from "@remix-run/interaction";

export type ProjectionRules = {
  /** containerWidth -> scale */
  scale: (ctx: ProjectionContext) => number;
  /** “origin” for content<->screen projection (your start param) */
  origin: (ctx: ProjectionContext) => QN.QN;
};

export class ProjectionContext extends TypedEventTarget<{ change: Event }> {
  #containerWidth: Px.Px = Px.zero;
  #container: HTMLElement | null = null;
  #getTimeline: () => Timeline.Timeline<QN.QN>;
  #rules: ProjectionRules;

  constructor(getTimeline: () => Timeline.Timeline<QN.QN>, rules: ProjectionRules) {
    super();
    this.#getTimeline = getTimeline;
    this.#rules = rules;
  }

  // ---- shared state + events (single source of truth)
  get containerWidth() {
    return this.#containerWidth;
  }
  get timeline() {
    return this.#getTimeline();
  }
  get view() {
    return this.#getTimeline().view;
  }

  setContainerWidth(width: Px.Px) {
    if (this.#containerWidth === width) return;
    this.#containerWidth = width;
    this.dispatchEvent(new Event("change"));
  }

  /** Signal listeners that derived values may have changed. */
  notifyChange() {
    this.dispatchEvent(new Event("change"));
  }

  setContainer(container: HTMLElement) {
    this.#container = container;
  }

  getPointerPosition(e: PointerEvent) {
    return getPointerPosition(e, this.#container);
  }

  getContainerRect(): DOMRect | null {
    return this.#container?.getBoundingClientRect() ?? null;
  }

  get container(): HTMLElement | null {
    return this.#container;
  }

  // ---- differing behavior is delegated
  get scale() {
    return this.#rules.scale(this);
  }

  get contentWidth() {
    return Scroll.width(QN.Numeric, this.#getTimeline().size, this.scale);
  }

  contentToScreenX(x: QN.QN): Px.Px {
    return Projection.toScreen(QN.Numeric, this.#rules.origin(this), x, this.scale);
  }

  screenToContentX(x: Px.Px): QN.QN {
    return Projection.fromScreen(QN.Numeric, this.#rules.origin(this), x, this.scale);
  }
}
