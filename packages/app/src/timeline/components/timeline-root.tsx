import type { Handle, Props } from "@remix-run/component";
import * as QN from "@daw/core/lib/qn";
import * as N from "@daw/core/lib/numeric";
import * as Timeline from "@daw/core/lib/timeline";
import * as Span from "@daw/core/lib/span";

// TODO: I don't like this. Come back and make this whole thing better.
export type TransportState = Readonly<{
  isPlaying: boolean;
  playheadPosition: QN.QN;
  follow: boolean;
  bpm: number;
  setPlayheadPosition: (pos: QN.QN) => void;
  togglePlay: () => void;
  toggleFollow: () => void;
  disableFollow: () => void;
}>;

export type TimelineRootContext = {
  get timeline(): Timeline.Timeline<QN.QN>;
  setTimeline: (next: Timeline.Timeline<QN.QN>) => void;
  get isInteracting(): boolean;
  setIsInteracting: (isInteracting: boolean) => void;
  get transport(): TransportState;
};

function makeInitialTimeline(): Timeline.Timeline<QN.QN> {
  return {
    size: QN.QN(500),
    min: QN.QN(0.5),
    view: Span.make(QN.QN(32), QN.QN(64)),
  };
}

const defaultTransport: TransportState = {
  isPlaying: false,
  playheadPosition: QN.zero,
  follow: true,
  bpm: 120,
  setPlayheadPosition: () => {},
  togglePlay: () => {},
  toggleFollow: () => {},
  disableFollow: () => {},
};

export function TimelineRoot(handle: Handle<TimelineRootContext>) {
  let isInteracting = false;
  let currentTimeline: Timeline.Timeline<QN.QN> = makeInitialTimeline();
  let currentTransport: TransportState = defaultTransport;

  handle.context.set({
    get timeline() {
      return currentTimeline;
    },
    setTimeline(next: Timeline.Timeline<QN.QN>) {
      currentTimeline = next;
      handle.update();
    },
    get isInteracting() {
      return isInteracting;
    },
    setIsInteracting(v: boolean) {
      isInteracting = v;
    },
    get transport() {
      return currentTransport;
    },
  });

  return ({
    transport = defaultTransport,
    ...props
  }: Props<"div"> & { transport?: TransportState }) => {
    currentTransport = transport;

    // Autoscroll: center the playhead in the viewport during playback
    if (transport.isPlaying && transport.follow && !isInteracting) {
      const viewCenter = N.add(currentTimeline.view.start, N.divide(currentTimeline.view.size, 2));
      const delta = N.subtract(transport.playheadPosition, viewCenter);
      if (Math.abs(Number(delta)) > 0.01) {
        currentTimeline = Timeline.panBy(currentTimeline, delta);
      }
    }

    return <div {...props} />;
  };
}
