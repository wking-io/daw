import type { Handle, Props } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";

/**
 * Props passed to the PopoverClose render function.
 */
export interface PopoverCloseProps extends Props<"button"> {
  class?: string;
}

/**
 * Close button for the popover.
 * Renders a `<button>` element that closes the popover when clicked.
 *
 * @example
 * ```tsx
 * <Popover.Content>
 *   <Popover.Close>×</Popover.Close>
 *   Content here
 * </Popover.Content>
 * ```
 */
export function PopoverClose(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (props: PopoverCloseProps) => {
    const { class: classes, children, ...rest } = props;

    return (
      <button
        type="button"
        data-state={ctx?.open ? "open" : "closed"}
        on={{
          click: () => ctx?.closePopover(),
        }}
        class={classes}
        {...rest}
      >
        {children}
      </button>
    );
  };
}

/**
 * Namespace containing all PopoverClose-related types.
 */
export namespace PopoverClose {
  export type Props = PopoverCloseProps;
}
