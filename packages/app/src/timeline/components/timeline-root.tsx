import type { Handle, Props } from "@remix-run/component";

import * as Px from "@daw/core/lib/px";
import * as Timeline from "@daw/core/lib/timeline";
import * as Span from "@daw/core/lib/span";

export type TimelineRootContext = {
  get timeline(): Timeline.Timeline<Px.Px>;
  setTimeline: (next: Timeline.Timeline<Px.Px>) => void;
  get isInteracting(): boolean;
  setIsInteracting: (isInteracting: boolean) => void;
};

function makeInitialTimeline(): Timeline.Timeline<Px.Px> {
  return {
    size: Px.Px(20000),
    min: Px.Px(200),
    view: Span.make(Px.Numeric, 2000, 4000),
  };
}

export function TimelineRoot(handle: Handle<TimelineRootContext>) {
  let isInteracting = false;

  let currentTimeline: Timeline.Timeline<Px.Px> = makeInitialTimeline();

  handle.context.set({
    get timeline() {
      return currentTimeline;
    },
    setTimeline(next: Timeline.Timeline<Px.Px>) {
      currentTimeline = next;
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
