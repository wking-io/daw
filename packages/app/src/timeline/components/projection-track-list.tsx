import type { Handle } from "@remix-run/component";
import * as Bucket from "@daw/core/lib/bucket-index";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import type { MidiNote } from "@daw/core/domain/midi";

import { ProjectionRoot } from "./projection-root";
import { Clip, type ClipProps } from "./clip";
import { MidiClipCanvas } from "./midi-clip-canvas";
import { AudioClipCanvas } from "./audio-clip-canvas";
import { resolveClipTitle } from "@daw/core/lib/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "../renderers/timeline/types";
import type { ProjectionContext } from "../lib/projection-context";
import { buildTrackLayouts, TITLE_BAR_HEIGHT } from "../lib/track-layout";

const CLIP_VERTICAL_PADDING = Px.Px(1);

type ClipData = Pick<
  ClipProps,
  | "id"
  | "title"
  | "height"
  | "width"
  | "x"
  | "y"
  | "isSelected"
  | "compact"
  | "titleBarHeight"
  | "contentHeight"
> & {
  trackColor: TrackColor;
  midiNotes: readonly MidiNote[] | null;
  clipSizeQN: number;
  payloadKind: "midi" | "audio";
  audioFileId: string | null;
  offsetSec: number;
  audioDurationSec: number;
};

function computeClips({
  data,
  state,
  projection,
}: {
  data: TimelineData;
  state: UIState;
  projection: ProjectionContext;
}): ClipData[] {
  const { view } = data;
  const trackLayouts = buildTrackLayouts(view.trackOrder, view.trackById);
  const visibleClips = Bucket.queryTracks(view.clipIndex, view.trackOrder, projection.view);

  const clips: ClipData[] = [];
  for (const [trackId, clipIds] of visibleClips) {
    const track = view.trackById.get(trackId);
    const trackLayout = trackLayouts.get(trackId);
    if (!track || !trackLayout) continue;

    for (const clipId of clipIds) {
      const clip = view.clipById.get(clipId);
      if (!clip) continue;

      const clipEnd = Span.end(QN.Numeric, clip.span);
      const left = projection.contentToScreenX(clip.span.start);
      const right = projection.contentToScreenX(clipEnd);
      const width = Px.max(Px.Px(1), Px.subtract(right, left));

      const top = Px.add(trackLayout.y, CLIP_VERTICAL_PADDING);
      const height = trackLayout.compact
        ? Px.Px(TITLE_BAR_HEIGHT)
        : Px.max(
            Px.Px(1),
            Px.subtract(trackLayout.height, Px.multiply(CLIP_VERTICAL_PADDING, 2)),
          );

      let midiNotes: readonly MidiNote[] | null = null;
      if (clip.payload.kind === "midi") {
        const pattern = view.patternById.get(clip.payload.patternId);
        if (pattern && pattern.notes.length > 0) {
          midiNotes = pattern.notes;
        }
      }

      clips.push({
        id: clip.id,
        title: resolveClipTitle(clip, view),
        x: left,
        y: top,
        width,
        height,
        compact: trackLayout.compact,
        titleBarHeight: trackLayout.titleBarHeight,
        contentHeight: trackLayout.contentHeight,
        isSelected: state.selectedClipId === clip.id,
        trackColor: track.color,
        midiNotes,
        clipSizeQN: clip.span.size as number,
        payloadKind: clip.payload.kind,
        audioFileId: clip.payload.kind === "audio" ? clip.payload.audioFileId : null,
        offsetSec: clip.payload.kind === "audio" ? clip.payload.offsetSec : 0,
        audioDurationSec: ((clip.span.size as number) * 60) / data.project.bpm,
      });
    }
  }
  return clips;
}

export function ProjectionTrackList(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);

  return ({
    data,
    state,
    dispatch,
  }: {
    data: TimelineData;
    state: UIState;
    dispatch: (action: UIAction) => void;
  }) => {
    const clips = computeClips({
      data,
      state,
      projection,
    });

    const onBackgroundPointerDown = () => {
      dispatch({ type: "select-clip", clipId: null });
    };

    return (
      <div
        class="absolute inset-0 overflow-hidden pointer-events-auto z-20"
        on={{ pointerdown: onBackgroundPointerDown }}
      >
        {clips.map(
          ({
            trackColor,
            midiNotes,
            clipSizeQN,
            payloadKind,
            audioFileId,
            offsetSec,
            audioDurationSec,
            ...clip
          }) => (
            <Clip
              key={clip.id}
              setup={{ color: trackColor }}
              dispatch={dispatch}
              {...clip}
            >
              {payloadKind === "midi" && midiNotes && (
                <MidiClipCanvas
                  notes={midiNotes}
                  clipSizeQN={clipSizeQN}
                  isSelected={clip.isSelected}
                />
              )}
              {payloadKind === "audio" && audioFileId && (
                <AudioClipCanvas
                  audioFileId={audioFileId}
                  offsetSec={offsetSec}
                  durationSec={audioDurationSec}
                  isSelected={clip.isSelected}
                />
              )}
            </Clip>
          ),
        )}
      </div>
    );
  };
}
