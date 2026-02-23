import type { Handle } from "@remix-run/component";
import * as SI from "@daw/core/lib/spatial-index";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as Range from "@daw/core/lib/range";
import type { Clip, MidiClipPayload } from "@daw/core/domain/clip";

import { Clip as ClipComponent, ClipContent, ClipHeader } from "./clip";
import { ProjectionRoot } from "./projection-root";
import { TimelineRoot } from "./timeline-root";
import { MidiClipCanvas } from "./midi-clip-canvas";
import { AudioClipCanvas } from "./audio-clip-canvas";
import { resolveClipTitle } from "@daw/core/domain/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "../renderers/timeline/types";
import type { ProjectionContext } from "../lib/projection-context";
import { buildTrackLayouts, TITLE_BAR_HEIGHT } from "../lib/track-layout";
import { Option } from "effect";
import { ClipDragDriver } from "../lib/clip-drag-driver";

const CLIP_VERTICAL_PADDING = Px.Px(1);

type ClipData = Clip & {
  color: TrackColor;
  visible: Span.Span<Px.Px>;
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  compact: boolean;
};

export function ProjectionTrackList(handle: Handle) {
  const projection = handle.context.get(ProjectionRoot);
  const rootCtx = handle.context.get(TimelineRoot);

  // Drag driver — thin effectful adapter over the pure state machine
  const drag = new ClipDragDriver({
    projection,
    setTimeline: rootCtx.setTimeline,
    onUpdate: () => handle.update(),
  });

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
    // Sync per-render data into the driver atomically
    const trackLayouts = buildTrackLayouts(data.view.trackOrder, data.view.trackById);

    drag.sync({
      timeSignature: data.project.timeSignature,
      trackLayouts,
      trackOrder: data.view.trackOrder,
      trackById: data.view.trackById,
      onCommit: (clipId, newStart, newTrackId) => {
        dispatch({ type: "commit-clip-move", clipId, newStart, newTrackId });
      },
    });

    return (
      <div
        class="absolute inset-0 overflow-hidden pointer-events-auto z-20"
        on={{
          pointerdown: () => {
            dispatch({ type: "select-clip", clipId: null });
          },
        }}
        connect={(node) => {
          const verticalContainer = node.closest("[data-vertical-scroll]") as HTMLElement | null;
          drag.setVerticalContainer(verticalContainer);
        }}
      >
        {mapClips(
          { view: data.view, projection },
          ({ color, visible, x, y, width, height, ...clip }) => (
            <ClipComponent
              key={clip.id}
              color={color}
              isSelected={state.selectedClipId === clip.id}
              x={visible.start}
              y={y}
              height={height}
              width={visible.size}
            >
              <ClipHeader
                on={{
                  pointerdown: (e) => {
                    e.stopPropagation();
                    dispatch({ type: "select-clip", clipId: clip.id });
                    drag.startPending(clip.id, e, {
                      originTrackId: clip.trackId,
                      origin: clip.span,
                      payloadKind: clip.payload.kind,
                      color,
                      width,
                      height,
                    });
                  },
                }}
              >
                {resolveClipTitle(clip.payload, data.view)}
              </ClipHeader>
              {!clip.compact && (
                <ClipContent height={height} isSelected={state.selectedClipId === clip.id}>
                  {clip.payload.kind === "midi" && (
                    <MidiClipCanvas
                      notes={getNotes(data.view, clip.payload)}
                      clipSizeQN={clip.span.size}
                      isSelected={state.selectedClipId === clip.id}
                      color={color}
                      visibleLeft={x}
                      visibleWidth={visible.size}
                      clipWidth={width}
                    />
                  )}
                  {clip.payload.kind === "audio" && (
                    <AudioClipCanvas
                      audioFileId={clip.payload.audioFileId}
                      offsetSec={clip.payload.offsetSec}
                      durationSec={(clip.span.size * 60) / data.project.bpm}
                      isSelected={state.selectedClipId === clip.id}
                      color={color}
                      visibleLeft={x}
                      visibleWidth={visible.size}
                      clipWidth={width}
                    />
                  )}
                </ClipContent>
              )}
            </ClipComponent>
          ),
        )}
        {Option.match(drag.ghost, {
          onNone: () => null,
          onSome: (ghost) => {
            const trackLayout = trackLayouts.get(ghost.trackId);
            const clip = data.view.clipById.get(ghost.clipId);
            if (!trackLayout || !clip) return null;

            // Compute ghost position directly — no viewport clipping
            const ghostX = projection.contentToScreenX(ghost.startQN);
            const ghostY = Px.add(trackLayout.y, CLIP_VERTICAL_PADDING);
            const ghostHeight = trackLayout.compact
              ? Px.Px(TITLE_BAR_HEIGHT)
              : Px.max(
                  Px.Px(1),
                  Px.subtract(trackLayout.height, Px.multiply(CLIP_VERTICAL_PADDING, 2)),
                );

            return (
              <div class="pointer-events-none opacity-50 z-30 absolute inset-0">
                <ClipComponent
                  x={ghostX}
                  y={ghostY}
                  width={ghost.width}
                  height={ghostHeight}
                  color={ghost.color}
                  isSelected={true}
                >
                  <ClipHeader>{resolveClipTitle(clip.payload, data.view)}</ClipHeader>
                  {!trackLayout.compact && (
                    <ClipContent height={ghostHeight} isSelected={true}>
                      {clip.payload.kind === "midi" && (
                        <MidiClipCanvas
                          notes={getNotes(data.view, clip.payload)}
                          clipSizeQN={clip.span.size}
                          isSelected={true}
                          color={ghost.color}
                          visibleLeft={Px.zero}
                          visibleWidth={ghost.width}
                          clipWidth={ghost.width}
                        />
                      )}
                      {clip.payload.kind === "audio" && (
                        <AudioClipCanvas
                          audioFileId={clip.payload.audioFileId}
                          offsetSec={clip.payload.offsetSec}
                          durationSec={(clip.span.size * 60) / data.project.bpm}
                          isSelected={true}
                          color={ghost.color}
                          visibleLeft={Px.zero}
                          visibleWidth={ghost.width}
                          clipWidth={ghost.width}
                        />
                      )}
                    </ClipContent>
                  )}
                </ClipComponent>
              </div>
            );
          },
        })}
      </div>
    );
  };
}

function mapClips<T>(
  {
    view,
    projection,
  }: {
    view: TimelineData["view"];
    projection: ProjectionContext;
  },
  fn: (clip: ClipData) => T,
): T[] {
  const trackLayouts = buildTrackLayouts(view.trackOrder, view.trackById);
  const visibleClips = SI.queryGroups(view.clipIndex, view.trackOrder, projection.view);

  return [...visibleClips].flatMap(([trackId, clipIds]) => {
    const track = view.trackById.get(trackId);
    const trackLayout = trackLayouts.get(trackId);
    if (!track || !trackLayout) return [];

    return clipIds.flatMap((clipId) => {
      const clip = view.clipById.get(clipId);
      if (!clip) return [];

      const clipRange = Span.toRange(QN.Numeric, clip.span);
      const clipScreenRange = Range.map(clipRange, (x) => projection.contentToScreenX(x));

      // Compute visible slice within the viewport
      const visibleScreenRange = Range.clamp(
        Px.Numeric,
        clipScreenRange,
        Range.make(Px.Numeric, Px.zero, projection.containerWidth),
      );

      const visible = Span.fromRange(Px.Numeric, visibleScreenRange);
      const x = Px.subtract(visible.start, clipScreenRange.start);
      const y = Px.add(trackLayout.y, CLIP_VERTICAL_PADDING);
      const width = Range.width(Px.Numeric, clipScreenRange);
      const height = trackLayout.compact
        ? Px.Px(TITLE_BAR_HEIGHT)
        : Px.max(Px.Px(1), Px.subtract(trackLayout.height, Px.multiply(CLIP_VERTICAL_PADDING, 2)));

      return fn({
        ...clip,
        color: track.color,
        visible,
        x,
        y,
        width,
        height,
        compact: trackLayout.compact,
      });
    });
  });
}

function getNotes(view: TimelineData["view"], payload: MidiClipPayload) {
  const pattern = view.patternById.get(payload.patternId);
  return pattern?.notes ?? [];
}
