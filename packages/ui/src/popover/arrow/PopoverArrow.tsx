import type { Handle, Props } from "@remix-run/component";
import { PopoverPositioner } from "../positioner/PopoverPositioner";

/**
 * Props passed to the PopoverArrow render function.
 */
export interface PopoverArrowProps extends Props<"div"> {
  /**
   * Width of the arrow in pixels.
   * @default 10
   */
  width?: number;
  /**
   * Height of the arrow in pixels.
   * @default 5
   */
  height?: number;
}

/**
 * Arrow component for the popover.
 * Must be used within a PopoverPositioner context.
 * Renders a `<div>` element containing an SVG arrow.
 *
 * @example
 * ```tsx
 * <Popover.Positioner>
 *   <Popover.Arrow width={12} height={6} />
 *   <Popover.Content>...</Popover.Content>
 * </Popover.Positioner>
 * ```
 */
export function PopoverArrow(handle: Handle) {
  const ctx = handle.context.get(PopoverPositioner);

  return (props: PopoverArrowProps) => {
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

/**
 * Namespace containing all PopoverArrow-related types.
 */
export namespace PopoverArrow {
  export type Props = PopoverArrowProps;
}
