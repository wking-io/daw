import type { Handle, Props } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";

/**
 * Props passed to the PopoverBackdrop render function.
 */
export interface PopoverBackdropProps extends Props<"div"> {
  class?: string;
}

/**
 * Backdrop component that closes the popover when clicked.
 * Renders a `<div>` element.
 *
 * @example
 * ```tsx
 * <Popover.Portal>
 *   <Popover.Backdrop class="fixed inset-0 bg-black/50" />
 *   <Popover.Content>...</Popover.Content>
 * </Popover.Portal>
 * ```
 */
export function PopoverBackdrop(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (props: PopoverBackdropProps) => {
    const { class: classes, ...rest } = props;

    return (
      <div
        data-state={ctx?.open ? "open" : "closed"}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        on={{
          click: () => ctx?.closePopover(),
        }}
        class={classes}
        {...rest}
      />
    );
  };
}

/**
 * Namespace containing all PopoverBackdrop-related types.
 */
export namespace PopoverBackdrop {
  export type Props = PopoverBackdropProps;
}
