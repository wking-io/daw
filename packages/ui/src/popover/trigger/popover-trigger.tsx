import type { Handle, Props } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";

/**
 * Props passed to the PopoverTrigger render function.
 */
export interface PopoverTriggerProps extends Props<"button"> {
  class?: string;
}

/**
 * Trigger button for the popover.
 * Renders a `<button>` element that toggles the popover.
 *
 * @example
 * ```tsx
 * <Popover.Root setup={{}}>
 *   <Popover.Trigger>Click me</Popover.Trigger>
 *   ...
 * </Popover.Root>
 * ```
 */
export function PopoverTrigger(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (props: PopoverTriggerProps) => {
    const { class: classes, children, ...rest } = props;

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ctx?.open ?? false}
        aria-controls={ctx?.popoverId}
        data-state={ctx?.open ? "open" : "closed"}
        connect={(el: HTMLButtonElement) => {
          ctx?.setTriggerRef(el);
        }}
        on={{
          click: () => ctx?.toggle(),
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
 * Namespace containing all PopoverTrigger-related types.
 */
export namespace PopoverTrigger {
  export type Props = PopoverTriggerProps;
}
