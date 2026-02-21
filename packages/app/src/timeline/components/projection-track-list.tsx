import type { Handle } from "@remix-run/component";
import * as SI from "@daw/core/lib/spatial-index";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as Range from "@daw/core/lib/range";
import type { MidiNote } from "@daw/core/domain/midi";

import { ProjectionRoot } from "./projection-root";
import { TimelineRoot } from "./timeline-root";
import { Clip, type ClipProps } from "./clip";
import { MidiClipCanvas } from "./midi-clip-canvas";
import { AudioClipCanvas } from "./audio-clip-canvas";
import { resolveClipTitle } from "@daw/core/domain/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "../renderers/timeline/types";
import type { ProjectionContext } from "../lib/projection-context";
import { buildTrackLayouts, TITLE_BAR_HEIGHT } from "../lib/track-layout";
import { ClipDragController } from "../lib/clip-drag";

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
  span: Span.Span<QN.QN>;
  trackId: string;
  trackColor: TrackColor;
  midiNotes: readonly MidiNote[] | null;
  payloadKind: "midi" | "audio";
  audioFileId: string | null;
  offsetSec: number;
  audioDurationSec: number;
  visibleSpan: Span.Span<Px.Px>;
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
  const visibleClips = SI.queryGroups(view.clipIndex, view.trackOrder, projection.view);

  const clips: ClipData[] = [];
  for (const [trackId, clipIds] of visibleClips) {
    const track = view.trackById.get(trackId);
    const trackLayout = trackLayouts.get(trackId);
    if (!track || !trackLayout) continue;

    for (const clipId of clipIds) {
      const clip = view.clipById.get(clipId);
      if (!clip) continue;

      const clipRange = Span.toRange(QN.Numeric, clip.span);
      const clipScreenRange = Range.map(clipRange, (x) => projection.contentToScreenX(x));

      // Compute visible slice within the viewport
      const visibleScreenRange = Range.clamp(
        Px.Numeric,
        clipScreenRange,
        Range.make(Px.Numeric, Px.zero, projection.containerWidth),
      );

      const top = Px.add(trackLayout.y, CLIP_VERTICAL_PADDING);
      const height = trackLayout.compact
        ? Px.Px(TITLE_BAR_HEIGHT)
        : Px.max(Px.Px(1), Px.subtract(trackLayout.height, Px.multiply(CLIP_VERTICAL_PADDING, 2)));

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
        x: clipScreenRange.start,
        y: top,
        width: Range.width(Px.Numeric, clipScreenRange),
        height,
        compact: trackLayout.compact,
        titleBarHeight: trackLayout.titleBarHeight,
        contentHeight: trackLayout.contentHeight,
        isSelected: state.selectedClipId === clip.id,
        trackId,
        trackColor: track.color,
        midiNotes,
        span: clip.span,
        visibleSpan: Span.fromRange(Px.Numeric, visibleScreenRange),
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
  const rootCtx = handle.context.get(TimelineRoot);

  // Drag controller — local mutable state, not in UIState
  const drag = new ClipDragController();
  drag.projection = projection;
  drag.rootCtx = rootCtx;
  drag.onUpdate = () => handle.update();

  // Global pointer/key listeners for drag (following ZoomWindow pattern)
  handle.on(window, {
    pointermove(e: PointerEvent) {
      drag.onPointerMove(e);
    },
    pointerup(e: PointerEvent) {
      drag.onPointerUp(e);
    },
    keydown(e: KeyboardEvent) {
      drag.onKeyDown(e);
    },
  });

  return ({
    data,
    state,
    dispatch,
  }: {
    data: TimelineData;
    state: UIState;
    dispatch: (action: UIAction) => void;
  }) => {
    // Wire commit callback with current dispatch
    drag.onCommit = (clipId, newStart, newTrackId) => {
      dispatch({ type: "commit-clip-move", clipId, newStart, newTrackId });
    };
    drag.timeSignature = data.project.timeSignature;

    // Update track data for hit-testing
    const trackLayouts = buildTrackLayouts(data.view.trackOrder, data.view.trackById);
    drag.trackLayouts = trackLayouts;
    drag.trackOrder = data.view.trackOrder;
    const trackTypeMap = new Map<string, { type: "midi" | "audio" | "bus"; color: TrackColor }>();
    for (const [id, track] of data.view.trackById) {
      trackTypeMap.set(id, { type: track.type, color: track.color });
    }
    drag.trackById = trackTypeMap;

    const clips = computeClips({
      data,
      state,
      projection,
    });

    const onBackgroundPointerDown = () => {
      dispatch({ type: "select-clip", clipId: null });
    };

    const onTitleBarPointerDown = (clipId: string, e: PointerEvent) => {
      const clipData = clips.find((c) => c.id === clipId);
      if (!clipData) return;

      drag.startPending(clipId, e, {
        originTrackId: clipData.trackId,
        origin: clipData.span,
        payloadKind: clipData.payloadKind,
        color: clipData.trackColor,
        clipWidth: clipData.width,
        clipHeight: clipData.height,
      });
    };

    // Build ghost clip rendering data
    // Look up the source clip directly from view data (not the visibility-filtered
    // `clips` array) so the ghost persists when the original clip scrolls off-screen.
    const ghost = drag.ghost;
    let ghostElement = null;
    if (ghost) {
      const ghostTrackLayout = trackLayouts.get(ghost.trackId);
      const sourceClipData = data.view.clipById.get(ghost.clipId);
      if (ghostTrackLayout && sourceClipData) {
        const ghostX = projection.contentToScreenX(ghost.startQN);
        const ghostY = Px.add(ghostTrackLayout.y, CLIP_VERTICAL_PADDING);
        const ghostHeight = ghostTrackLayout.compact
          ? Px.Px(TITLE_BAR_HEIGHT)
          : Px.max(
              Px.Px(1),
              Px.subtract(ghostTrackLayout.height, Px.multiply(CLIP_VERTICAL_PADDING, 2)),
            );
        const ghostWidth = ghost.width as number;
        const noop = () => {};

        let midiNotes: readonly MidiNote[] | null = null;
        if (sourceClipData.payload.kind === "midi") {
          const pattern = data.view.patternById.get(sourceClipData.payload.patternId);
          if (pattern && pattern.notes.length > 0) {
            midiNotes = pattern.notes;
          }
        }

        const title = resolveClipTitle(sourceClipData, data.view);
        const payloadKind = sourceClipData.payload.kind;

        ghostElement = (
          <div class="pointer-events-none opacity-50 z-30 absolute inset-0">
            <Clip
              id={ghost.clipId}
              title={title}
              x={ghostX}
              y={ghostY}
              width={ghost.width}
              height={ghostHeight}
              color={ghost.color}
              compact={ghostTrackLayout.compact}
              titleBarHeight={ghostTrackLayout.titleBarHeight}
              contentHeight={ghostTrackLayout.contentHeight}
              isSelected={true}
              dispatch={noop as any}
            >
              {payloadKind === "midi" && midiNotes && (
                <MidiClipCanvas
                  notes={midiNotes}
                  clipSizeQN={sourceClipData.span.size as number}
                  isSelected={true}
                  color={ghost.color}
                  visibleLeft={0}
                  visibleWidth={ghostWidth}
                  clipWidth={ghostWidth}
                />
              )}
              {payloadKind === "audio" && sourceClipData.payload.kind === "audio" && (
                <AudioClipCanvas
                  audioFileId={sourceClipData.payload.audioFileId}
                  offsetSec={sourceClipData.payload.offsetSec}
                  durationSec={((sourceClipData.span.size as number) * 60) / data.project.bpm}
                  isSelected={true}
                  color={ghost.color}
                  visibleLeft={0}
                  visibleWidth={ghostWidth}
                  clipWidth={ghostWidth}
                />
              )}
            </Clip>
          </div>
        );
      }
    }

    return (
      <div
        class="absolute inset-0 overflow-hidden pointer-events-auto z-20"
        on={{ pointerdown: onBackgroundPointerDown }}
        connect={(node) => {
          const verticalContainer = node.closest("[data-vertical-scroll]") as HTMLElement | null;
          drag.setVerticalContainer(verticalContainer);
        }}
      >
        {clips.map(
          ({
            trackId: _trackId,
            trackColor,
            midiNotes,
            span,
            visibleSpan,
            width,
            payloadKind,
            audioFileId,
            offsetSec,
            audioDurationSec,
            x,
            width: _fullWidth,
            ...clip
          }) => (
            <Clip
              key={clip.id}
              color={trackColor}
              dispatch={dispatch}
              onTitleBarPointerDown={onTitleBarPointerDown}
              x={Px.Px(Math.max(0, x as number))}
              width={visibleSpan.size}
              {...clip}
            >
              {payloadKind === "midi" && midiNotes && (
                <MidiClipCanvas
                  notes={midiNotes}
                  clipSizeQN={span.size}
                  isSelected={clip.isSelected}
                  color={trackColor}
                  visibleLeft={Px.subtract(visibleSpan.start, x)}
                  visibleWidth={visibleSpan.size}
                  clipWidth={width}
                />
              )}
              {payloadKind === "audio" && audioFileId && (
                <AudioClipCanvas
                  audioFileId={audioFileId}
                  offsetSec={offsetSec}
                  durationSec={audioDurationSec}
                  isSelected={clip.isSelected}
                  color={trackColor}
                  visibleLeft={Px.subtract(visibleSpan.start, x)}
                  visibleWidth={visibleSpan.size}
                  clipWidth={width}
                />
              )}
            </Clip>
          ),
        )}
        {ghostElement}
      </div>
    );
  };
}
