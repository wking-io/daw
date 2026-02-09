import type { Handle, Props, RemixNode } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";

/**
 * Props passed to the PopoverContent render function.
 */
export interface PopoverContentProps extends Props<"div"> {
  class?: string;
  children: RemixNode;
}

/**
 * Content component for the popover.
 * Renders a `<div>` element with role="dialog".
 * Handles Escape key to close the popover.
 *
 * @example
 * ```tsx
 * <Popover.Positioner>
 *   <Popover.Content class="bg-white p-4 rounded shadow">
 *     Popover content here
 *   </Popover.Content>
 * </Popover.Positioner>
 * ```
 */
export function PopoverContent(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      ctx?.closePopover();
    }
  };

  handle.on(document, { keydown: handleKeyDown });

  return (props: PopoverContentProps) => {
    const { class: classes, children, ...rest } = props;

    return (
      <div
        id={ctx?.popoverId}
        role="dialog"
        aria-modal="false"
        data-state={ctx?.open ? "open" : "closed"}
        connect={(el: HTMLDivElement) => {
          el.focus();
        }}
        tabindex={-1}
        class={classes}
        {...rest}
      >
        {children}
      </div>
    );
  };
}

/**
 * Namespace containing all PopoverContent-related types.
 */
export namespace PopoverContent {
  export type Props = PopoverContentProps;
}
