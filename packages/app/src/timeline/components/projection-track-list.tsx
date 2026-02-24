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
import { ClipResizeDriver } from "../lib/clip-resize-driver";
import type { ResizeEdge } from "../lib/clip-resize";

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
          ({ color, visible, x, y, width, height, ...clip }) => (
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
                  const target = e.target as HTMLElement;
                  const resizeEdge = target.dataset.resizeEdge as ResizeEdge | undefined;
                  if (resizeEdge) {
                    e.stopPropagation();
                    dispatch({ type: "select-clip", clipId: clip.id });
                    resize.startPending(clip.id, resizeEdge, e, clip.span, color);
                  }
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
                      clipSize={clip.span.size}
                      isSelected={state.selectedClipId === clip.id}
                      color={color}
                      projection={ClipProjection.make(
                        Crop.make(clip.span.size, clip.span.size, QN.zero),
                        width,
                        x,
                        visible.size,
                      )}
                      offset={clip.offset}
                    />
                  )}
                  {clip.payload.kind === "audio" && (
                    <AudioClipCanvas
                      audioFileId={clip.payload.audioFileId}
                      offset={clip.payload.offset}
                      duration={Sec.fromQN(
                        N.add(clip.offset, clip.payload.length),
                        data.project.bpm,
                      )}
                      isSelected={state.selectedClipId === clip.id}
                      color={color}
                      projection={ClipProjection.make(
                        Crop.make(clip.payload.length, clip.span.size, clip.offset),
                        width,
                        x,
                        visible.size,
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
                      {clip.payload.kind === "midi" && (
                        <MidiClipCanvas
                          notes={getNotes(data.view, clip.payload)}
                          clipSize={clip.span.size}
                          isSelected={true}
                          color={ghost.color}
                          projection={ClipProjection.make(
                            Crop.make(clip.span.size, clip.span.size, QN.zero),
                            ghost.width,
                            Px.zero,
                            ghost.width,
                          )}
                          offset={clip.offset}
                        />
                      )}
                      {clip.payload.kind === "audio" &&
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
                                Px.zero,
                                ghost.width,
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

            // Render ghost content at the original clip's scale so the
            // waveform/notes stay visually anchored — resize looks like a crop.
            const origStartX = projection.contentToScreenX(ghost.originSpan.start);
            const origEndX = projection.contentToScreenX(Span.end(ghost.originSpan));
            const origWidth = N.subtract(origEndX, origStartX);
            // visibleLeft: offset into the original content.
            //   right edge (anchor left): 0 — content stays left-aligned
            //   left edge  (anchor right): origWidth - ghostWidth (may be negative when extending)
            const cropLeft = ghost.edge === "right" ? Px.zero : N.subtract(origWidth, ghostWidth);
            return (
              <div class="pointer-events-none opacity-50 z-30 absolute inset-0">
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
                      {clip.payload.kind === "midi" && (
                        <MidiClipCanvas
                          notes={getNotes(data.view, clip.payload)}
                          clipSize={ghost.originSpan.size}
                          isSelected={true}
                          color={ghost.color}
                          projection={ClipProjection.make(
                            Crop.make(ghost.originSpan.size, ghost.originSpan.size, QN.zero),
                            origWidth,
                            cropLeft,
                            ghostWidth,
                          )}
                          offset={clip.offset}
                        />
                      )}
                      {clip.payload.kind === "audio" &&
                        (() => {
                          const startDelta = N.subtract(ghost.span.start, ghost.originSpan.start);
                          const crop = Crop.move(
                            Crop.make(clip.payload.length, ghost.originSpan.size, clip.offset),
                            startDelta,
                          );
                          return (
                            <AudioClipCanvas
                              audioFileId={clip.payload.audioFileId}
                              offset={clip.payload.offset}
                              duration={Sec.fromQN(clip.payload.length, data.project.bpm)}
                              isSelected={true}
                              color={ghost.color}
                              projection={ClipProjection.make(
                                crop,
                                origWidth,
                                Px.zero,
                                ghostWidth,
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

function getNotes(view: TimelineData["view"], payload: MidiClipPayload) {
  const pattern = view.patternById.get(payload.patternId);
  return pattern?.notes ?? [];
}
