import type { Handle } from "@remix-run/component";
import * as SI from "@daw/core/lib/spatial-index";
import * as N from "@daw/core/lib/numeric";
import * as Px from "@daw/core/lib/px";
import * as QN from "@daw/core/lib/qn";
import * as Span from "@daw/core/lib/span";
import * as Range from "@daw/core/lib/range";
import * as Crop from "@daw/core/lib/crop";
import * as ClipProjection from "@daw/core/lib/clip-projection";
import * as Sec from "@daw/core/lib/sec";
import {
  type Clip,
  type MidiClipPayload,
  type MidiLoopPayload,
  isMidiPayload,
  isAudioPayload,
  payloadFamily,
} from "@daw/core/domain/clip";

import { Clip as ClipComponent, ClipContent, ClipHeader } from "./clip";
import { ProjectionRoot } from "./projection-root";
import { TimelineRoot } from "./timeline-root";
import { MidiClipCanvas } from "./midi-clip-canvas";
import { AudioClipCanvas } from "./audio-clip-canvas";
import { resolveClipTitle } from "@daw/core/domain/project-view";
import type { UIAction, TimelineData, UIState, TrackColor } from "../renderers/timeline/types";
import type { ProjectionContext } from "../lib/projection-context";
import { buildTrackLayouts, TITLE_BAR_HEIGHT } from "../lib/track-layout";
import { Option, Function, pipe } from "effect";
import { ClipDragDriver } from "../lib/clip-drag-driver";
import { ClipResizeDriver } from "../lib/clip-resize-driver";
import { decodeResizeEdge, ResizeEdge } from "../lib/clip-resize";

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

  // Resize driver — same pattern as drag
  const resize = new ClipResizeDriver({
    projection,
    setTimeline: rootCtx.setTimeline,
    onUpdate: () => handle.update(),
  });

  // Global pointer/key listeners for drag and resize
  handle.on(window, {
    pointermove(e: PointerEvent) {
      drag.onPointerMove(e);
      resize.onPointerMove(e);
    },
    pointerup(e: PointerEvent) {
      drag.onPointerUp(e);
      resize.onPointerUp(e);
    },
    keydown(e: KeyboardEvent) {
      drag.onKeyDown(e);
      resize.onKeyDown(e);
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
    // Sync per-render data into the drivers atomically
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

    resize.sync({
      timeSignature: data.project.timeSignature,
      onCommit: (clipId, span) => {
        dispatch({ type: "commit-clip-resize", clipId, span });
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
          ({ color, visible, x, y, width, height, ...clip }) =>
            pipe(
              resize.ghost,
              Option.flatMap((ghost) =>
                ghost.clipId === clip.id ? Option.some(ghost) : Option.none(),
              ),
              Option.isNone,
            ) && (
              <ClipComponent
                key={clip.id}
                color={color}
                isSelected={state.selectedClipId === clip.id}
                x={visible.start}
                y={y}
                height={height}
                width={visible.size}
                on={{
                  pointerdown: (e: PointerEvent) => {
                    Option.match(checkResizeEdge(e), {
                      onSome: (edge) => {
                        e.stopPropagation();
                        dispatch({ type: "select-clip", clipId: clip.id });
                        resize.startPending(clip.id, edge, e, clip.span, color);
                      },
                      onNone: Function.constVoid,
                    });
                  },
                }}
              >
                <ClipHeader
                  on={{
                    pointerdown: (e) => {
                      e.stopPropagation();
                      dispatch({ type: "select-clip", clipId: clip.id });
                      drag.startPending(clip.id, e, {
                        originTrackId: clip.trackId,
                        origin: clip.span,
                        payloadKind: payloadFamily(clip.payload),
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
                    {isMidiPayload(clip.payload) && (
                      <MidiClipCanvas
                        notes={getNotes(data.view, clip.payload)}
                        isSelected={state.selectedClipId === clip.id}
                        color={color}
                        projection={ClipProjection.make(
                          Crop.make(clip.span.size, clip.span.size, QN.zero),
                          width,
                          Span.make(x, visible.size),
                        )}
                        offset={clip.offset}
                      />
                    )}
                    {isAudioPayload(clip.payload) && (
                      <AudioClipCanvas
                        audioFileId={clip.payload.audioFileId}
                        offset={clip.payload.offset}
                        duration={Sec.fromQN(clip.payload.length, data.project.bpm)}
                        isSelected={state.selectedClipId === clip.id}
                        color={color}
                        projection={ClipProjection.make(
                          Crop.make(clip.payload.length, clip.span.size, clip.offset),
                          width,
                          Span.make(x, visible.size),
                        )}
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
            const ghostX = projection.contentToScreenX(ghost.start);
            const ghostY = N.add(trackLayout.y, CLIP_VERTICAL_PADDING);
            const ghostHeight = trackLayout.compact
              ? Px.Px(TITLE_BAR_HEIGHT)
              : N.max(
                  Px.Px(1),
                  N.subtract(trackLayout.height, N.multiply(CLIP_VERTICAL_PADDING, 2)),
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
                      {isMidiPayload(clip.payload) && (
                        <MidiClipCanvas
                          notes={getNotes(data.view, clip.payload)}
                          isSelected={true}
                          color={ghost.color}
                          projection={ClipProjection.make(
                            Crop.make(clip.span.size, clip.span.size, QN.zero),
                            ghost.width,
                            Span.make(Px.zero, ghost.width),
                          )}
                          offset={clip.offset}
                        />
                      )}
                      {isAudioPayload(clip.payload) &&
                        (() => {
                          const src = N.add(clip.offset, clip.span.size);
                          return (
                            <AudioClipCanvas
                              audioFileId={clip.payload.audioFileId}
                              offset={clip.payload.offset}
                              duration={Sec.fromQN(src, data.project.bpm)}
                              isSelected={true}
                              color={ghost.color}
                              projection={ClipProjection.make(
                                Crop.make(src, clip.span.size, clip.offset),
                                ghost.width,
                                Span.make(Px.zero, ghost.width),
                              )}
                            />
                          );
                        })()}
                    </ClipContent>
                  )}
                </ClipComponent>
              </div>
            );
          },
        })}
        {Option.match(resize.ghost, {
          onNone: () => null,
          onSome: (ghost) => {
            const clip = data.view.clipById.get(ghost.clipId);
            if (!clip) return null;

            const trackLayout = trackLayouts.get(clip.trackId);
            if (!trackLayout) return null;

            // Ghost span (the resized clip preview)
            const ghostX = projection.contentToScreenX(ghost.span.start);
            const ghostEndX = projection.contentToScreenX(Span.end(ghost.span));
            const ghostWidth = N.subtract(ghostEndX, ghostX);
            const ghostY = N.add(trackLayout.y, CLIP_VERTICAL_PADDING);
            const ghostHeight = trackLayout.compact
              ? Px.Px(TITLE_BAR_HEIGHT)
              : N.max(
                  Px.Px(1),
                  N.subtract(trackLayout.height, N.multiply(CLIP_VERTICAL_PADDING, 2)),
                );

            // Full source extent on the timeline
            const sourceStartQN = N.subtract(ghost.originSpan.start, clip.offset);
            const sourceEndQN = N.add(sourceStartQN, clip.payload.length);
            const sourceX = projection.contentToScreenX(sourceStartQN);
            const sourceEndX = projection.contentToScreenX(sourceEndQN);
            const sourceWidth = N.subtract(sourceEndX, sourceX);

            // Offset into the source for the ghost span's start position
            const ghostOffset = N.add(
              clip.offset,
              N.subtract(ghost.span.start, ghost.originSpan.start),
            );

            return (
              <div class="pointer-events-none z-30 absolute inset-0">
                {/* Full source extent — ghosted background */}
                {!trackLayout.compact && (
                  <div class="opacity-35 dark:opacity-25">
                    <ClipComponent
                      x={sourceX}
                      y={ghostY}
                      width={sourceWidth}
                      height={ghostHeight}
                      color={ghost.color}
                      isSelected={false}
                    >
                      <ClipHeader>{""}</ClipHeader>
                      <ClipContent height={ghostHeight} isSelected={false}>
                        {isMidiPayload(clip.payload) && (
                          <MidiClipCanvas
                            notes={getNotes(data.view, clip.payload)}
                            isSelected={false}
                            color={ghost.color}
                            projection={ClipProjection.make(
                              Crop.make(clip.payload.length, clip.payload.length, QN.zero),
                              sourceWidth,
                              Span.make(Px.zero, sourceWidth),
                            )}
                            offset={0}
                          />
                        )}
                        {isAudioPayload(clip.payload) && (
                          <AudioClipCanvas
                            audioFileId={clip.payload.audioFileId}
                            offset={clip.payload.offset}
                            duration={Sec.fromQN(clip.payload.length, data.project.bpm)}
                            isSelected={false}
                            color={ghost.color}
                            projection={ClipProjection.make(
                              Crop.make(clip.payload.length, clip.payload.length, QN.zero),
                              sourceWidth,
                              Span.make(Px.zero, sourceWidth),
                            )}
                          />
                        )}
                      </ClipContent>
                    </ClipComponent>
                  </div>
                )}
                {/* Resized clip — solid, rendered on top */}
                <ClipComponent
                  x={ghostX}
                  y={ghostY}
                  width={ghostWidth}
                  height={ghostHeight}
                  color={ghost.color}
                  isSelected={true}
                >
                  <ClipHeader>{resolveClipTitle(clip.payload, data.view)}</ClipHeader>
                  {!trackLayout.compact && (
                    <ClipContent height={ghostHeight} isSelected={true}>
                      {isMidiPayload(clip.payload) && (
                        <MidiClipCanvas
                          notes={getNotes(data.view, clip.payload)}
                          isSelected={true}
                          color={ghost.color}
                          projection={ClipProjection.make(
                            Crop.make(clip.payload.length, ghost.span.size, ghostOffset),
                            ghostWidth,
                            Span.make(Px.zero, ghostWidth),
                          )}
                          offset={0}
                        />
                      )}
                      {isAudioPayload(clip.payload) &&
                        (() => {
                          return (
                            <AudioClipCanvas
                              audioFileId={clip.payload.audioFileId}
                              offset={clip.payload.offset}
                              duration={Sec.fromQN(clip.payload.length, data.project.bpm)}
                              isSelected={true}
                              color={ghost.color}
                              projection={ClipProjection.make(
                                Crop.make(clip.payload.length, ghost.span.size, ghostOffset),
                                ghostWidth,
                                Span.make(Px.zero, ghostWidth),
                              )}
                            />
                          );
                        })()}
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

      const clipRange = Span.toRange(clip.span);
      const clipScreenRange = Range.map(clipRange, (x) => projection.contentToScreenX(x));

      // Compute visible slice within the viewport
      const visibleScreenRange = Range.clamp(
        clipScreenRange,
        Range.make(Px.zero, projection.containerWidth),
      );

      const visible = Span.fromRange(visibleScreenRange);
      const x = N.subtract(visible.start, clipScreenRange.start);
      const y = N.add(trackLayout.y, CLIP_VERTICAL_PADDING);
      const width = Range.width(clipScreenRange);
      const height = trackLayout.compact
        ? Px.Px(TITLE_BAR_HEIGHT)
        : N.max(Px.Px(1), N.subtract(trackLayout.height, N.multiply(CLIP_VERTICAL_PADDING, 2)));

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

function getNotes(view: TimelineData["view"], payload: MidiClipPayload | MidiLoopPayload) {
  const pattern = view.patternById.get(payload.patternId);
  return pattern?.notes ?? [];
}

function checkResizeEdge(e: PointerEvent): Option.Option<ResizeEdge> {
  if (e.target instanceof HTMLElement) {
    return decodeResizeEdge(e.target.dataset.resizeEdge);
  }
  return Option.none();
}
