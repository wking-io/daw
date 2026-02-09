import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  hide,
  offset,
  type Placement,
  shift,
  size,
} from "@floating-ui/dom";
import type { Handle, Props, RemixNode } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";

/**
 * Side positioning options.
 */
export type PopoverPositionerSide = "top" | "bottom" | "left" | "right";

/**
 * Alignment options.
 */
export type PopoverPositionerAlign = "start" | "center" | "end";

/**
 * State of the positioned element.
 */
export interface PopoverPositionerState {
  side: PopoverPositionerSide;
  align: PopoverPositionerAlign;
  anchorHidden: boolean;
  isPositioned: boolean;
}

interface PositionerStyles {
  top: number;
  left: number;
  transformOrigin: string;
}

interface ArrowStyles {
  top?: number;
  left?: number;
}

/**
 * Context value provided by PopoverPositioner.
 */
export interface PopoverPositionerContextValue {
  arrowStyles: ArrowStyles;
  arrowRef: (el: HTMLElement | null) => void;
  state: PopoverPositionerState;
}

/**
 * Props passed to the PopoverPositioner render function.
 */
export interface PopoverPositionerProps extends Props<"div"> {
  /**
   * Which side of the trigger to position on.
   * @default "bottom"
   */
  side?: PopoverPositionerSide;
  /**
   * How to align along the side.
   * @default "center"
   */
  align?: PopoverPositionerAlign;
  /**
   * Offset from the trigger along the main axis.
   * @default 8
   */
  sideOffset?: number;
  /**
   * Offset from the trigger along the cross axis.
   * @default 0
   */
  alignOffset?: number;
  /**
   * Padding from viewport edges for collision detection.
   * @default 8
   */
  collisionPadding?: number;
  /**
   * Padding for arrow positioning.
   * @default 5
   */
  arrowPadding?: number;
  /**
   * Whether to use sticky positioning.
   * @default false
   */
  sticky?: boolean;
  children: RemixNode;
}

function getPlacement(side: PopoverPositionerSide, align: PopoverPositionerAlign): Placement {
  if (align === "center") return side;
  return `${side}-${align}`;
}

const validSides: PopoverPositionerSide[] = ["top", "bottom", "left", "right"];
const validAligns: PopoverPositionerAlign[] = ["start", "center", "end"];

function isValidSide(value: string): value is PopoverPositionerSide {
  return validSides.includes(value as PopoverPositionerSide);
}

function isValidAlign(value: string | undefined): value is PopoverPositionerAlign {
  return value !== undefined && validAligns.includes(value as PopoverPositionerAlign);
}

function getSideFromPlacement(placement: Placement): PopoverPositionerSide {
  const side = placement.split("-")[0];
  if (side && isValidSide(side)) {
    return side;
  }
  return "bottom"; // fallback
}

function getAlignFromPlacement(placement: Placement): PopoverPositionerAlign {
  const parts = placement.split("-");
  const align = parts[1];
  if (isValidAlign(align)) {
    return align;
  }
  return "center"; // fallback
}

function getTransformOrigin(side: PopoverPositionerSide, align: PopoverPositionerAlign): string {
  const alignValue = align === "start" ? "left" : align === "end" ? "right" : "center";
  const verticalAlignValue = align === "start" ? "top" : align === "end" ? "bottom" : "center";

  switch (side) {
    case "top":
      return `${alignValue} bottom`;
    case "bottom":
      return `${alignValue} top`;
    case "left":
      return `right ${verticalAlignValue}`;
    case "right":
      return `left ${verticalAlignValue}`;
  }
}

/**
 * Positioner component for the popover content.
 * Positions content relative to the trigger using Floating UI.
 * Renders a `<div>` element.
 *
 * @example
 * ```tsx
 * <Popover.Portal>
 *   <Popover.Positioner side="bottom" align="start">
 *     <Popover.Arrow />
 *     <Popover.Content>...</Popover.Content>
 *   </Popover.Positioner>
 * </Popover.Portal>
 * ```
 */
export function PopoverPositioner(handle: Handle<PopoverPositionerContextValue>) {
  const ctx = handle.context.get(PopoverRoot);

  let styles: PositionerStyles | null = null;
  let arrowStyles: ArrowStyles = {};
  let arrowElement: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;
  let renderedSide: PopoverPositionerSide = "bottom";
  let renderedAlign: PopoverPositionerAlign = "center";
  let anchorHidden = false;
  let isPositioned = false;

  const arrowRef = (el: HTMLElement | null) => {
    arrowElement = el;
  };

  handle.context.set({
    get arrowStyles() {
      return arrowStyles;
    },
    arrowRef,
    get state() {
      return {
        side: renderedSide,
        align: renderedAlign,
        anchorHidden,
        isPositioned,
      };
    },
  });

  return (props: PopoverPositionerProps) => {
    const {
      side = "bottom",
      align = "center",
      sideOffset = 8,
      alignOffset = 0,
      collisionPadding = 8,
      arrowPadding = 5,
      sticky = false,
      class: classes,
      children,
      ...rest
    } = props;

    const anchor = ctx?.triggerRef ?? null;
    const placement = getPlacement(side, align);

    const positionStyle: Record<string, string | number> = styles
      ? {
          position: "absolute",
          top: `${styles.top}px`,
          left: `${styles.left}px`,
          "--transform-origin": styles.transformOrigin,
        }
      : {
          position: "absolute",
          top: 0,
          left: 0,
          visibility: "hidden",
        };

    return (
      <div
        data-side={renderedSide}
        data-align={renderedAlign}
        data-positioned={isPositioned ? "" : undefined}
        data-anchor-hidden={anchorHidden ? "" : undefined}
        style={positionStyle}
        class={classes}
        connect={(el, signal) => {
          if (!anchor) return;

          const updatePosition = async () => {
            const middleware = [
              offset({
                mainAxis: sideOffset,
                crossAxis: alignOffset,
              }),
              flip({
                padding: collisionPadding,
              }),
              shift({
                padding: collisionPadding,
                limiter: sticky
                  ? undefined
                  : {
                      fn: ({ x, y }) => ({ x, y }),
                    },
              }),
              size({
                padding: collisionPadding,
                apply({ availableWidth, availableHeight, rects }) {
                  Object.entries({
                    "--available-width": `${availableWidth}px`,
                    "--available-height": `${availableHeight}px`,
                    "--anchor-width": `${rects.reference.width}px`,
                    "--anchor-height": `${rects.reference.height}px`,
                  }).forEach(([key, value]) => {
                    el.style.setProperty(key, value);
                  });
                },
              }),
              hide({
                strategy: "referenceHidden",
              }),
            ];

            if (arrowElement) {
              middleware.push(
                arrowMiddleware({
                  element: arrowElement,
                  padding: arrowPadding,
                }),
              );
            }

            const result = await computePosition(anchor, el, {
              placement,
              middleware,
            });

            renderedSide = getSideFromPlacement(result.placement);
            renderedAlign = getAlignFromPlacement(result.placement);
            anchorHidden = result.middlewareData.hide?.referenceHidden ?? false;

            styles = {
              top: result.y,
              left: result.x,
              transformOrigin: getTransformOrigin(renderedSide, renderedAlign),
            };

            if (result.middlewareData.arrow) {
              arrowStyles = {
                top: result.middlewareData.arrow.y,
                left: result.middlewareData.arrow.x,
              };
            }

            isPositioned = true;
            handle.update();
          };

          cleanup = autoUpdate(anchor, el, updatePosition);

          signal.addEventListener("abort", () => {
            cleanup?.();
            cleanup = null;
          });
        }}
        {...rest}
      >
        {children}
      </div>
    );
  };
}

/**
 * Namespace containing all PopoverPositioner-related types.
 */
export namespace PopoverPositioner {
  export type Side = PopoverPositionerSide;
  export type Align = PopoverPositionerAlign;
  export type State = PopoverPositionerState;
  export type Props = PopoverPositionerProps;
  export type ContextValue = PopoverPositionerContextValue;
}
