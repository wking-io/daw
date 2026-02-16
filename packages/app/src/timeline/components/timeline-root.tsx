import type { Handle, Props } from "@remix-run/component";
import * as QN from "@daw/core/lib/qn";
import * as Timeline from "@daw/core/lib/timeline";
import * as Span from "@daw/core/lib/span";

export type TimelineRootContext = {
  get timeline(): Timeline.Timeline<QN.QN>;
  setTimeline: (next: Timeline.Timeline<QN.QN>) => void;
  panByPixels: (deltaPixels: number) => void;
  get isInteracting(): boolean;
  setIsInteracting: (isInteracting: boolean) => void;
};

function makeInitialTimeline(): Timeline.Timeline<QN.QN> {
  return {
    size: QN.QN(500),
    min: QN.QN(0.25),
    view: Span.make(QN.Numeric, 32, 64),
  };
}

export function TimelineRoot(handle: Handle<TimelineRootContext>) {
  let isInteracting = false;

  let currentTimeline: Timeline.Timeline<QN.QN> = makeInitialTimeline();

  handle.context.set({
    get timeline() {
      return currentTimeline;
    },
    setTimeline(next: Timeline.Timeline<QN.QN>) {
      currentTimeline = next;
      handle.update();
    },
    panByPixels(deltaPixels: number) {
      const delta = QN.QN(deltaPixels * 0.1);
      if (delta === 0) return;
      currentTimeline = Timeline.panBy(QN.Numeric, currentTimeline, delta);
      handle.update();
    },
    get isInteracting() {
      return isInteracting;
    },
    setIsInteracting(v: boolean) {
      isInteracting = v;
    },
  });

  return (props: Props<"div">) => {
    return <div {...props} />;
  };
}
