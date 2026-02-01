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

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

export interface PositionerState {
  side: Side;
  align: Align;
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

function getPlacement(side: Side, align: Align): Placement {
  if (align === "center") return side;
  return `${side}-${align}`;
}

function getSideFromPlacement(placement: Placement): Side {
  return placement.split("-")[0] as Side;
}

function getAlignFromPlacement(placement: Placement): Align {
  const parts = placement.split("-");
  return (parts[1] as Align) || "center";
}

function getTransformOrigin(side: Side, align: Align): string {
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

export interface PositionerContextValue {
  arrowStyles: ArrowStyles;
  arrowRef: (el: HTMLElement | null) => void;
  state: PositionerState;
}

export function Positioner(handle: Handle<PositionerContextValue>) {
  let styles: PositionerStyles | null = null;
  let arrowStyles: ArrowStyles = {};
  let arrowElement: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;
  let renderedSide: Side = "bottom";
  let renderedAlign: Align = "center";
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

  return (
    props: Props<"div"> & {
      anchor: HTMLElement | null;
      side?: Side;
      align?: Align;
      sideOffset?: number;
      alignOffset?: number;
      collisionPadding?: number;
      arrowPadding?: number;
      sticky?: boolean;
      children: RemixNode;
    },
  ) => {
    const {
      anchor,
      side = "bottom",
      align = "center",
      sideOffset = 0,
      alignOffset = 0,
      collisionPadding = 8,
      arrowPadding = 5,
      sticky = false,
      class: className,
      children,
      ...rest
    } = props;

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
        class={className}
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

export function PositionerArrow(handle: Handle) {
  const ctx = handle.context.get(Positioner);

  return (
    props: Props<"div"> & {
      width?: number;
      height?: number;
    },
  ) => {
    const { width = 10, height = 5, class: className, ...rest } = props;

    const arrowStyle: Record<string, string | number | undefined> = {
      position: "absolute",
      top: ctx?.arrowStyles.top != null ? `${ctx.arrowStyles.top}px` : undefined,
      left: ctx?.arrowStyles.left != null ? `${ctx.arrowStyles.left}px` : undefined,
      width: `${width}px`,
      height: `${height}px`,
    };

    return (
      <div connect={(el) => ctx?.arrowRef(el)} style={arrowStyle} class={className} {...rest}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          style={{ display: "block" }}
        >
          <polygon points={`0,${height} ${width / 2},0 ${width},${height}`} />
        </svg>
      </div>
    );
  };
}
